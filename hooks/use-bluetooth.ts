import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import type { Permission } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { firestore, serverTimestamp } from '@/src/firebase/config';

const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';
const OASYS_EOL = '\r\n';
const OASYS_HEARTBEAT_MS = 1200;
const OASYS_SEND_BURST_COUNT = 3;
const OASYS_SEND_BURST_GAP_MS = 170;
const SR_PREFIX_BURST_COUNT = 2;
const SR_PREFIX_BURST_GAP_MS = 120;

export interface LogEntry {
  id: number;
  weight: string;
  time: string;
  status: 'sent' | 'failed';
  mode: 'selling' | 'remaining' | 'oasys_scale' | 'Scale' | 'System' | 'POS' | 'Error';
}

export interface SendWeightResult {
  ok: boolean;
  message: string;
  label?: string;
}

type WeightProtocol = 'oasys_scale' | 'sr_prefix';

export function useBluetoothManager(lang: 'en' | 'ta') {
  const [device, setDevice] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('notConnected');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(false);
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [weightMode, setWeightMode] = useState<'selling' | 'remaining'>('selling');
  const [lineEnding, setLineEnding] = useState<'lf' | 'crlf'>('crlf');
  const [connectionMode, setConnectionMode] = useState<'client' | 'server'>('client');
  const [isAccepting, setIsAccepting] = useState(false);
  const [weightProtocol, setWeightProtocol] = useState<WeightProtocol>('oasys_scale');
  const [lastScaleFrame, setLastScaleFrame] = useState<string>('');

  const connectionStatusRef = useRef(connectionStatus);
  const manualDisconnectRef = useRef(false);
  const heartbeatFailCountRef = useRef(0);
  const lastWriteAtRef = useRef(0);
  const sendLockRef = useRef(false);
  // Store the device ref so sendWeight always has access to the current device
  const deviceRef = useRef<any>(null);
  // Keep protocol in a ref so connection/send always reads latest value (no stale closures)
  const weightProtocolRef = useRef<WeightProtocol>(weightProtocol);

  const eol = lineEnding === 'crlf' ? '\r\n' : '\n';
  const formatOasysScaleFrame = useCallback((weight: number, delimiter = OASYS_EOL) => {
    const padded = weight.toFixed(3).padStart(8, ' ');
    return `ST,GS,${padded}kg${delimiter}`;
  }, []);

  /** Build the payload for Billing POS (sr_prefix) mode */
  const formatSrPrefixFrame = useCallback((weight: number, delimiter = '\r\n') => {
    const formatted = weight.toFixed(2);
    return `SR${formatted}${delimiter}`;
  }, []);

  const inferWeightProtocol = useCallback((targetDevice: any): WeightProtocol => {
    const name = String(targetDevice?.name ?? targetDevice?.deviceName ?? '').toLowerCase();
    if (/(oasys|ews|scale)/i.test(name)) return 'oasys_scale';
    return weightProtocol;
  }, [weightProtocol]);

  const applyDeviceDefaults = useCallback((targetDevice: any) => {
    const nextProtocol = inferWeightProtocol(targetDevice);
    setWeightProtocol(nextProtocol);
    if (nextProtocol === 'oasys_scale') {
      setLineEnding('crlf');
      setConnectionMode('client');
    }
    return nextProtocol;
  }, [inferWeightProtocol]);

  // Keep deviceRef in sync so sendWeight always reads latest device
  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  // Keep protocolRef in sync
  useEffect(() => {
    weightProtocolRef.current = weightProtocol;
  }, [weightProtocol]);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    if (weightProtocol === 'oasys_scale') {
      setLineEnding('crlf');
      setConnectionMode('client');
    }
  }, [weightProtocol]);

  // Persistence
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('pos_line_ending');
        if (stored === 'lf' || stored === 'crlf') setLineEnding(stored);

        const storedMode = await AsyncStorage.getItem('pos_connection_mode');
        if (storedMode === 'server' || storedMode === 'client') setConnectionMode(storedMode);

        const storedProto = await AsyncStorage.getItem('pos_weight_protocol');
        if (storedProto === 'oasys_scale' || storedProto === 'sr_prefix') {
          setWeightProtocol(storedProto);
          if (storedProto === 'oasys_scale') {
            setLineEnding('crlf');
            setConnectionMode('client');
          }
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const save = async () => {
      try {
        await AsyncStorage.setItem('pos_line_ending', lineEnding);
        await AsyncStorage.setItem('pos_connection_mode', connectionMode);
        await AsyncStorage.setItem('pos_weight_protocol', weightProtocol);
      } catch (e) {
        console.error('Failed to save settings', e);
      }
    };
    save();
  }, [lineEnding, connectionMode, weightProtocol]);

  const addLog = useCallback((tag: string, weight: string, status: 'sent' | 'failed', mode: any) => {
    const time = new Date().toLocaleTimeString();
    const newLog: LogEntry = {
      id: Date.now(),
      weight: tag === 'POS >>' ? tag : `${weight} kg`,
      time,
      status,
      mode: tag === 'POS >>' ? weight : mode,
    };
    setActivityLog(prev => {
      const updated = [newLog, ...prev.slice(0, 49)]; // keep up to 50
      // Persist to AsyncStorage so History tab can read independently
      AsyncStorage.setItem('bt_activity_log', JSON.stringify(updated)).catch(() => null);
      return updated; // keep same 50 in memory (matches AsyncStorage)
    });

  }, []);

  const initiateHandshake = useCallback(async (connectedDevice: any, protocol: WeightProtocol = weightProtocol) => {
    if (!connectedDevice) return;

    console.log(`[Handshake] Starting POS handshake for ${connectedDevice.address} (protocol=${protocol})...`);
    let pulseCount = 0;
    const maxPulses = 2;
    // For OASYS: send a zero-weight scale frame
    // For Billing POS (sr_prefix): send a simple SR0.00 init frame
    const signals =
      protocol === 'oasys_scale'
        ? [formatOasysScaleFrame(0)]
        : [formatSrPrefixFrame(0)];

    const sendPulse = async () => {
      if (pulseCount >= maxPulses) {
        console.log('[Handshake] Handshake finished.');
        heartbeatFailCountRef.current = 0;
        setIsHeartbeatActive(true);
        addLog('System', 'POS Link Active', 'sent', 'System');
        return;
      }

      try {
        for (const signal of signals) {
          await RNBluetoothClassic.writeToDevice(connectedDevice.address, signal, 'ascii');
          lastWriteAtRef.current = Date.now();
          console.log(`[Handshake] Sent pulse ${pulseCount + 1}: ${JSON.stringify(signal)}`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        pulseCount++;
        setTimeout(sendPulse, 1000);
      } catch (err) {
        console.error('[Handshake] Pulse failed:', err);
        setIsHeartbeatActive(false);
      }
    };

    setTimeout(sendPulse, 500);
  }, [addLog, formatOasysScaleFrame, formatSrPrefixFrame, weightProtocol]);

  const isSocketOpen = useCallback(async (address?: string | null) => {
    if (!address) return false;
    try {
      return await RNBluetoothClassic.isDeviceConnected(address);
    } catch {
      return false;
    }
  }, []);

  /**
   * Probe the socket up to `maxRetries` times with a short delay.
   * This prevents false "disconnected" readings from transient BT stack hiccups.
   */
  const isSocketOpenWithRetry = useCallback(async (address: string, maxRetries = 3, delayMs = 200): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      const open = await isSocketOpen(address);
      if (open) return true;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return false;
  }, [isSocketOpen]);

  const resolveConnectedDevice = useCallback(async (address: string, fallback?: any) => {
    try {
      const direct = await (RNBluetoothClassic as any).getConnectedDevice?.(address);
      if (direct?.address) return direct;
    } catch (e) {
      console.log('getConnectedDevice fallback failed:', e);
    }
    const devices = await RNBluetoothClassic.getConnectedDevices();
    const connected = devices.find((d: any) => d?.address === address);
    if (connected) return connected;

    if (fallback?.address === address) {
      const fallbackOpen = await isSocketOpen(address);
      if (fallbackOpen) return fallback;
    }

    return null;
  }, [isSocketOpen]);

  const saveLastDevice = async (address: string) => {
    try {
      await AsyncStorage.setItem('last_device_address', address);
    } catch (e) {
      console.error('Failed to save last device', e);
    }
  };

  const ensurePaired = useCallback(async (selectedDevice: any) => {
    if (!selectedDevice?.address) return;
    if (selectedDevice?.bonded === false) {
      try {
        await RNBluetoothClassic.pairDevice(selectedDevice.address);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } catch (pairErr) {
        console.log('Pair attempt skipped/failed:', pairErr);
      }
    }
  }, []);

  const acceptWithFallback = useCallback(
    async (expectedAddress?: string, delimiter = eol) => {
      const candidates = [
        {
          acceptorType: 'rfcomm',
          connectionType: 'delimited',
          delimiter,
          charset: 'ascii',
          secure: false,
          connectionUuid: SPP_UUID,
          serviceName: 'BMI_POS_LINK',
        },
        {
          acceptorType: 'rfcomm',
          connectionType: 'delimited',
          delimiter,
          charset: 'ascii',
          secure: true,
          connectionUuid: SPP_UUID,
          serviceName: 'BMI_POS_LINK',
        },
      ];

      const errors: string[] = [];
      setIsAccepting(true);
      for (const options of candidates) {
        let timeoutId: any;
        try {
          await RNBluetoothClassic.cancelAccept().catch(() => false);
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              void RNBluetoothClassic.cancelAccept().catch(() => false);
              reject(new Error('Timed out waiting for POS. Open Bluetooth connect on POS and retry.'));
            }, 30000);
          });

          const accepted = await Promise.race([
            RNBluetoothClassic.accept(options as any),
            timeoutPromise,
          ]) as any;

          clearTimeout(timeoutId);
          if (!accepted?.address) {
            throw new Error('POS did not provide a valid Bluetooth address.');
          }

          if (expectedAddress && accepted.address !== expectedAddress) {
            await RNBluetoothClassic.disconnectFromDevice(accepted.address).catch(() => false);
            throw new Error(`Unexpected device connected (${accepted.address}). Please connect from selected POS (${expectedAddress}).`);
          }

          const resolved = await resolveConnectedDevice(accepted.address, accepted);
          const connectedDevice = resolved ?? accepted;
          const socketOpen = await isSocketOpenWithRetry(connectedDevice.address);
          if (!socketOpen) {
            throw new Error('POS connected briefly but socket closed immediately.');
          }
          return connectedDevice;
        } catch (err: any) {
          clearTimeout(timeoutId);
          const msg = err?.message || String(err);
          errors.push(msg);
          console.log('Accept attempt failed:', options, msg);
        }
      }
      const reason = errors[0] || 'Unknown acceptor error.';
      throw new Error(`Unable to accept POS connection. ${reason}`);
    },
    [eol, isSocketOpenWithRetry, resolveConnectedDevice]
  );

  const connectWithFallback = useCallback(
    async (address: string, fallbackDevice?: any, delimiter = eol) => {
      const candidates = [
        {
          connectorType: 'rfcomm',
          connectionType: 'delimited',
          delimiter,
          charset: 'ascii',
          secure: false,
          connectionUuid: SPP_UUID,
        },
        {
          connectorType: 'rfcomm',
          connectionType: 'delimited',
          delimiter,
          charset: 'ascii',
          secure: true,
          connectionUuid: SPP_UUID,
        },
        {
          connectorType: 'rfcomm',
          secure: false,
          connectionUuid: SPP_UUID,
        },
        {
          connectorType: 'rfcomm',
          secure: true,
          connectionUuid: SPP_UUID,
        },
      ];

      const alreadyConnected = await isSocketOpenWithRetry(address);
      if (alreadyConnected) {
        const resolved = await resolveConnectedDevice(address, fallbackDevice);
        if (resolved && (await isSocketOpen(resolved.address))) return resolved;
      }

      const errors: string[] = [];
      for (const options of candidates) {
        try {
          const connected = await RNBluetoothClassic.connectToDevice(address, options as any);
          const resolved = await resolveConnectedDevice(address, connected);
          if (resolved && (await isSocketOpen(resolved.address))) return resolved;
        } catch (err: any) {
          const msg = err?.message || String(err);
          errors.push(msg);
          console.log('Connect attempt failed:', options, msg);
        }
      }

      const reason = errors[0] || 'Unknown Bluetooth socket error.';
      throw new Error(`Unable to connect to POS. ${reason}`);
    },
    [eol, isSocketOpen, isSocketOpenWithRetry, resolveConnectedDevice]
  );

  const writeToConnectedDevice = useCallback(async (connectedDevice: any, payload: string) => {
    if (!connectedDevice?.address) {
      throw new Error('Missing connected POS address.');
    }

    const address = connectedDevice.address;
    const writers = [
      async () => {
        if (typeof connectedDevice?.write !== 'function') return false;
        return connectedDevice.write(payload, 'ascii');
      },
      async () => RNBluetoothClassic.writeToDevice(address, payload, 'ascii'),
    ];

    let lastErr: any = null;
    for (const write of writers) {
      try {
        const written = await write();
        if (written !== false) {
          lastWriteAtRef.current = Date.now();
          return true;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    if (lastErr) throw lastErr;
    throw new Error('Bluetooth write failed.');
  }, []);

  const writePayloadBurst = useCallback(
    async (connectedDevice: any, payload: string, count = 1, gapMs = 0) => {
      for (let attempt = 0; attempt < count; attempt++) {
        await writeToConnectedDevice(connectedDevice, payload);
        if (attempt < count - 1 && gapMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, gapMs));
        }
      }
    },
    [writeToConnectedDevice]
  );

  const verifyConnectedDevice = useCallback(async (connectedDevice: any, protocol: WeightProtocol = weightProtocol) => {
    if (!connectedDevice?.address) return false;

    const address = connectedDevice.address;
    const socketOpen = await isSocketOpenWithRetry(address);
    if (!socketOpen) return false;

    try {
      // Send a protocol-appropriate probe to verify the socket is truly writable
      const probes: string[] =
        protocol === 'oasys_scale'
          ? [formatOasysScaleFrame(0)]
          : [formatSrPrefixFrame(0)];

      for (const probe of probes) {
        await writeToConnectedDevice(connectedDevice, probe);
        await new Promise((resolve) => setTimeout(resolve, 150));
        const stillOpen = await isSocketOpen(address);
        if (!stillOpen) return false;
      }

      return await isSocketOpenWithRetry(address);
    } catch (err) {
      console.log('Connection probe failed:', err);
      return false;
    }
  }, [formatOasysScaleFrame, formatSrPrefixFrame, isSocketOpen, isSocketOpenWithRetry, weightProtocol, writeToConnectedDevice]);

  const requestBluetoothPermissions = useCallback(async (needsScan: boolean) => {
    if (Platform.OS !== 'android') return true;

    const sdk =
      typeof Platform.Version === 'number'
        ? Platform.Version
        : parseInt(String(Platform.Version), 10);

    const requiredPermissions: Permission[] = [];

    if (sdk >= 31) {
      if (needsScan) {
        requiredPermissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      }
      requiredPermissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    } else if (needsScan) {
      requiredPermissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    if (requiredPermissions.length === 0) return true;

    const result = await PermissionsAndroid.requestMultiple(requiredPermissions);
    const denied = requiredPermissions.filter(
      (permission) => result[permission] !== PermissionsAndroid.RESULTS.GRANTED
    );

    if (denied.length > 0) {
      Alert.alert(
        'Bluetooth permission required',
        'Allow Bluetooth permissions to discover and connect to POS devices.'
      );
      return false;
    }

    return true;
  }, []);

  const ensureBluetoothReady = useCallback(
    async (needsScan: boolean) => {
      if (Platform.OS === 'web') return false;
      if (Platform.OS !== 'android') return true;

      const hasPermission = await requestBluetoothPermissions(needsScan);
      if (!hasPermission) return false;

      try {
        const available = await RNBluetoothClassic.isBluetoothAvailable();
        if (!available) {
          Alert.alert('Bluetooth unavailable', 'This device does not support Bluetooth.');
          return false;
        }

        const enabled = await RNBluetoothClassic.isBluetoothEnabled();
        if (enabled) return true;

        const userEnabled = await RNBluetoothClassic.requestBluetoothEnabled();
        if (!userEnabled) {
          Alert.alert(
            'Bluetooth turned off',
            'Enable Bluetooth to discover and connect to POS devices.'
          );
          return false;
        }

        return true;
      } catch (error: any) {
        console.error('Bluetooth readiness check failed:', error);
        Alert.alert('Bluetooth error', error?.message || 'Unable to initialize Bluetooth.');
        return false;
      }
    },
    [requestBluetoothPermissions]
  );

  const checkLastDevice = useCallback(async () => {
    try {
      const address = await AsyncStorage.getItem('last_device_address');
      if (address) {
        const ready = await ensureBluetoothReady(false);
        if (!ready) {
          setConnectionStatus('notConnected');
          return;
        }
        setConnectionStatus('connecting');
        const isConnected = await isSocketOpenWithRetry(address);
        if (isConnected) {
          const connectedDevice = await RNBluetoothClassic.getConnectedDevices();
          const match = connectedDevice.find(d => d.address === address);
          if (match) {
            const restoredProtocol = applyDeviceDefaults(match);
            const verified = await verifyConnectedDevice(match, restoredProtocol);
            if (verified) {
              heartbeatFailCountRef.current = 0;
              setDevice(match);
              setConnectionStatus('connected');
              initiateHandshake(match, restoredProtocol);
              return;
            }
            await AsyncStorage.removeItem('last_device_address').catch(() => null);
          }
        }

        await AsyncStorage.removeItem('last_device_address').catch(() => null);
        setDevice(null);
        setConnectionStatus('notConnected');
        setIsHeartbeatActive(false);
      }
    } catch (e) {
      console.error('Auto-connect failed', e);
      setDevice(null);
      setConnectionStatus('notConnected');
      setIsHeartbeatActive(false);
    }
  }, [applyDeviceDefaults, ensureBluetoothReady, initiateHandshake, isSocketOpenWithRetry, verifyConnectedDevice]);

  const disconnectDevice = async () => {
    if (!device) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    manualDisconnectRef.current = true;
    try {
      await RNBluetoothClassic.cancelAccept().catch(() => false);
      await RNBluetoothClassic.disconnectFromDevice(device.address);
      setDevice(null);
      setConnectionStatus('notConnected');
      setIsHeartbeatActive(false);
    } catch (err) {
      console.error('Disconnect failed', err);
      setDevice(null);
      setConnectionStatus('notConnected');
      setIsHeartbeatActive(false);
    } finally {
      setIsAccepting(false);
      manualDisconnectRef.current = false;
    }
  };

  const connectToDevice = async (selectedDevice: any) => {
    if (Platform.OS === 'web' || isScanning || !selectedDevice?.address) return false;

    const ready = await ensureBluetoothReady(false);
    if (!ready) {
      setConnectionStatus('notConnected');
      return false;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnectionStatus('connecting');
    setIsScanning(true);
    try {
      const selectedProtocol = applyDeviceDefaults(selectedDevice);
      // Use the resolved protocol directly — NOT the stale state values
      const selectedDelimiter = selectedProtocol === 'oasys_scale' ? OASYS_EOL : '\r\n';
      // Determine connection order from the resolved protocol (avoids stale state read)
      const selectedConnectionMode: 'client' | 'server' =
        selectedProtocol === 'oasys_scale' ? 'client' : connectionMode;

      await RNBluetoothClassic.cancelDiscovery().catch(() => false);
      await ensurePaired(selectedDevice);
      // Give POS machines enough time after pairing to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      let connectedDeviceObj: any = null;
      const errors: any[] = [];
      const connectionOrder: Array<'server' | 'client'> =
        selectedConnectionMode === 'client' ? ['client', 'server'] : ['server', 'client'];

      for (const mode of connectionOrder) {
        try {
          if (mode === 'server') {
            connectedDeviceObj = await acceptWithFallback(selectedDevice.address, selectedDelimiter);
          } else {
            connectedDeviceObj = await connectWithFallback(selectedDevice.address, selectedDevice, selectedDelimiter);
          }
          if (connectedDeviceObj) break;
        } catch (err) {
          errors.push(err);
          console.log(`${mode.toUpperCase()} connection attempt failed:`, err);
        }
      }

      if (connectedDeviceObj) {
        const resolvedProtocol = applyDeviceDefaults(connectedDeviceObj);
        // Small stabilization delay before verify probe
        await new Promise(resolve => setTimeout(resolve, 500));
        const verified = await verifyConnectedDevice(connectedDeviceObj, resolvedProtocol);
        if (!verified) {
          throw new Error('Connected socket is unstable. Please reconnect from POS and try again.');
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        manualDisconnectRef.current = false;
        heartbeatFailCountRef.current = 0;
        setDevice(connectedDeviceObj);
        setConnectionStatus('connected');
        saveLastDevice(connectedDeviceObj.address);
        initiateHandshake(connectedDeviceObj, resolvedProtocol);
        return true;
      } else {
        throw errors[0] || new Error('Device failed to report connected state.');
      }
    } catch (err: any) {
      console.error('Final Connection error:', err);
      await RNBluetoothClassic.cancelAccept().catch(() => false);
      setDevice(null);
      setConnectionStatus('notConnected');
      setIsHeartbeatActive(false);
      setIsAccepting(false);
      Alert.alert('Connection Failure', err.message || 'Failed to connect.');
      return false;
    } finally {
      setIsAccepting(false);
      setIsScanning(false);
    }
  };

  const startDiscovery = async () => {
    if (Platform.OS === 'web') return;

    const ready = await ensureBluetoothReady(true);
    if (!ready) {
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    try {
      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      setDiscoveredDevices(bondedDevices);
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(prev => {
        const all = [...prev, ...devices];
        return all.filter((dev, index, self) => index === self.findIndex((t) => t.address === dev.address));
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Discovery failed', 'Could not scan for Bluetooth devices. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const sendWeight = async (weight: string | number, userId?: string): Promise<SendWeightResult> => {
    const currentDevice = deviceRef.current;
    const weightValRaw = String(weight).trim();
    const normalizedWeight = weightValRaw.replace(',', '.');
    const parsedWeight = Number(normalizedWeight);

    if (!currentDevice?.address) {
      return { ok: false, message: 'POS is not connected.' };
    }

    if (!weightValRaw || Number.isNaN(parsedWeight)) {
      return { ok: false, message: 'Enter a valid weight.' };
    }

    if (sendLockRef.current) {
      return { ok: false, message: 'Previous weight is still sending.' };
    }

    sendLockRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSending(true);
    try {
      // Read protocol from ref to avoid stale closure
      const currentProtocol = weightProtocolRef.current;
      let payload = '';
      let logWeight = normalizedWeight;
      let logMode: 'oasys_scale' | 'selling' | 'remaining' = weightMode;
      let sendCount = 1;
      let sendGapMs = 0;
      let label = `${parsedWeight} kg`;

      if (currentProtocol === 'oasys_scale') {
        const frame = formatOasysScaleFrame(parsedWeight);
        setLastScaleFrame(frame);
        payload = frame;
        logWeight = parsedWeight.toFixed(3);
        logMode = 'oasys_scale';
        label = `${logWeight} kg`;
        sendCount = OASYS_SEND_BURST_COUNT;
        sendGapMs = OASYS_SEND_BURST_GAP_MS;
      } else {
        // Billing POS (sr_prefix): send SR-prefixed weight
        payload = formatSrPrefixFrame(parsedWeight);
        logWeight = parsedWeight.toFixed(2);
        logMode = weightMode;
        label = `${logWeight} kg`;
        sendCount = SR_PREFIX_BURST_COUNT;
        sendGapMs = SR_PREFIX_BURST_GAP_MS;
      }

      // Retry the socket check because Android Bluetooth can briefly report false negatives.
      const socketReady = await isSocketOpenWithRetry(currentDevice.address, 5, 250);
      if (!socketReady) {
        // Only clear device state after confirmed failure with retries
        setDevice(null);
        setConnectionStatus('notConnected');
        setIsHeartbeatActive(false);
        throw new Error('POS connection lost. Please reconnect and send again.');
      }

      await writePayloadBurst(currentDevice, payload, sendCount, sendGapMs);
      heartbeatFailCountRef.current = 0;
      addLog(
        currentProtocol === 'oasys_scale' ? 'Scale' : 'POS',
        logWeight,
        'sent',
        logMode
      );
      // Non-critical path: persist log in Firestore without blocking next send.
      if (userId) {
        firestore.collection('weight_history').add({
          userId,
          weight: parsedWeight,
          mode: weightMode,
          timestamp: serverTimestamp(),
          status: 'sent',
          protocol: currentProtocol
        }).catch((fErr: any) => {
          console.error('Firestore log failed:', fErr);
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { ok: true, message: 'Sent', label };
    } catch (err) {
      console.error('Send weight failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      // Only clear device state on definitive connection errors
      if (/not connected|socket|closed|broken pipe|connection lost/i.test(message)) {
        setDevice(null);
        setConnectionStatus('notConnected');
        setIsHeartbeatActive(false);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addLog('Error', weightValRaw || String(weight), 'failed', 'Error');
      return { ok: false, message };
    } finally {
      sendLockRef.current = false;
      setIsSending(false);
    }
  };

  // Heartbeat — keeps the Bluetooth socket alive by periodically writing
  useEffect(() => {
    let interval: any;
    if (connectionStatus === 'connected' && isHeartbeatActive && device) {
      const isOasys = weightProtocol === 'oasys_scale';
      const heartbeatInterval = isOasys ? OASYS_HEARTBEAT_MS : 5000;

      interval = setInterval(async () => {
        try {
          if (sendLockRef.current) return;

          const elapsed = Date.now() - lastWriteAtRef.current;

          if (isOasys) {
            if (elapsed < OASYS_HEARTBEAT_MS - 100) return;
            await writeToConnectedDevice(device, lastScaleFrame || formatOasysScaleFrame(0));
          } else {
            // Billing POS: send SR-prefixed zero-weight keepalive less frequently
            if (elapsed < 4500) return;
            await writeToConnectedDevice(device, formatSrPrefixFrame(0));
          }
          heartbeatFailCountRef.current = 0;
        } catch {
          heartbeatFailCountRef.current += 1;
          if (heartbeatFailCountRef.current >= 3) {
            setDevice(null);
            setConnectionStatus('notConnected');
            setIsHeartbeatActive(false);
          }
        }
      }, heartbeatInterval);
    }
    return () => clearInterval(interval);
  }, [connectionStatus, device, formatOasysScaleFrame, formatSrPrefixFrame, isHeartbeatActive, lastScaleFrame, weightProtocol, writeToConnectedDevice]);

  useEffect(() => {
    return () => {
      void RNBluetoothClassic.cancelAccept().catch(() => false);
    };
  }, []);

  // Device disconnect listener keeps UI state aligned with actual socket state.
  useEffect(() => {
    const onDeviceDisconnected = (RNBluetoothClassic as any).onDeviceDisconnected?.((event: any) => {
      const disconnectedAddress = event?.device?.address;
      if (!deviceRef.current?.address || disconnectedAddress !== deviceRef.current.address) return;
      const wasManual = manualDisconnectRef.current;
      manualDisconnectRef.current = false;
      setDevice(null);
      setConnectionStatus('notConnected');
      setIsHeartbeatActive(false);
      if (!wasManual) {
        addLog('System', 'POS disconnected', 'failed', 'System');
      }
    });

    return () => onDeviceDisconnected?.remove?.();
  // Intentionally no device in dep: we use deviceRef to avoid re-registering on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog]);

  // Read listener
  useEffect(() => {
    if (!device?.address || connectionStatus !== 'connected') return;
    const onDataReceived = (RNBluetoothClassic as any).onDeviceRead(device.address, (event: any) => {
      const dataStr = typeof event?.data === 'string' ? event.data : String(event?.data ?? '');
      if (/ews|st,gs|kg/i.test(dataStr) && weightProtocol !== 'oasys_scale') {
        setWeightProtocol('oasys_scale');
        setLineEnding('crlf');
      }
      addLog('POS >>', dataStr, 'sent', 'POS');
    });
    return () => onDataReceived?.remove?.();
  }, [device?.address, connectionStatus, addLog, weightProtocol]);

  return {
    device,
    connectionStatus,
    isScanning,
    isAccepting,
    discoveredDevices,
    activityLog,
    isSending,
    weightMode,
    setWeightMode,
    lineEnding,
    setLineEnding,
    connectionMode,
    setConnectionMode,
    weightProtocol,
    setWeightProtocol,
    startDiscovery,
    connectToDevice,
    disconnectDevice,
    sendWeight,
    checkLastDevice,
    lastScaleFrame,
  };
}
