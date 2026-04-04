import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import type { Permission } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { firestore, serverTimestamp } from '@/src/firebase/config';

const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';

export interface LogEntry {
  id: number;
  weight: string;
  time: string;
  status: 'sent' | 'failed';
  mode: 'selling' | 'remaining' | 'Scale';
}

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
  const [weightProtocol, setWeightProtocol] = useState<'oasys_scale' | 'sr_prefix'>('sr_prefix');
  const [lastScaleFrame, setLastScaleFrame] = useState<string>('');

  const connectionStatusRef = useRef(connectionStatus);
  const manualDisconnectRef = useRef(false);
  const heartbeatFailCountRef = useRef(0);
  const eol = lineEnding === 'crlf' ? '\r\n' : '\n';
  const copy =
    lang === 'ta'
      ? {
          connectionFailureTitle: '\u0b87\u0ba3\u0bc8\u0baa\u0bcd\u0baa\u0bc1 \u0ba4\u0bcb\u0bb2\u0bcd\u0bb5\u0bbf',
          wrongBluetoothDeviceTitle: '\u0ba4\u0bb5\u0bb1\u0bbe\u0ba9 Bluetooth \u0b9a\u0bbe\u0ba4\u0ba9\u0bae\u0bcd',
          wrongBluetoothDeviceMessage:
            '\u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f \u0b9a\u0bbe\u0ba4\u0ba9\u0bae\u0bcd \u0bae\u0bca\u0baa\u0bc8\u0bb2\u0bcd \u0b85\u0bb2\u0bcd\u0bb2\u0ba4\u0bc1 \u0bae\u0b9f\u0b95\u0bcd\u0b95\u0ba3\u0bbf\u0ba9\u0bbf \u0baa\u0bcb\u0bb2 \u0ba4\u0bc6\u0bb0\u0bbf\u0b95\u0bbf\u0bb1\u0ba4\u0bc1. \u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bbf\u0bb2\u0bbf\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd POS \u0b9f\u0bc6\u0bb0\u0bcd\u0bae\u0bbf\u0ba9\u0bb2\u0bc8 \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd.',
          genericConnectionMessage:
            '\u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f POS-\u0b89\u0b9f\u0ba9\u0bcd \u0b87\u0ba3\u0bc8\u0b95\u0bcd\u0b95 \u0bae\u0bc1\u0b9f\u0bbf\u0baf\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8. POS \u0b85\u0bb0\u0bc1\u0b95\u0bbf\u0bb2\u0bcd \u0b89\u0bb3\u0bcd\u0bb3\u0ba4\u0bbe, Bluetooth \u0b87\u0baf\u0a95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0bc1\u0bb3\u0bcd\u0bb3\u0ba4\u0bbe, \u0bae\u0bb1\u0bcd\u0bb1 \u0b92\u0bb0\u0bc1 \u0b9a\u0bbe\u0ba4\u0ba9\u0bae\u0bcd \u0b8f\u0bb1\u0bcd\u0b95\u0ba9\u0bb5\u0bc7 \u0b87\u0ba3\u0bc8\u0ba8\u0bcd\u0ba4\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8\u0baf\u0bbe \u0b8e\u0ba9\u0bcd\u0baa\u0ba4\u0bc8 \u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0ba4\u0bcd\u0ba4\u0bc1 \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0bae\u0bc1\u0baf\u0bb1\u0bcd\u0b9a\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd.',
          inboundConnectionHint:
            '\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd POS \u0b89\u0bb3\u0bcd\u0bb5\u0bb0\u0bc1\u0bae\u0bcd \u0b87\u0ba3\u0bc8\u0baa\u0bcd\u0baa\u0bc8 \u0b8e\u0ba4\u0bbf\u0bb0\u0bcd\u0baa\u0bbe\u0bb0\u0bcd\u0ba4\u0bcd\u0ba4\u0bbe\u0bb2\u0bcd, POS-\u0b87\u0bb2\u0bcd Bluetooth \u0ba4\u0bbf\u0bb0\u0bc8\u0baf\u0bc8 \u0ba4\u0bbf\u0bb1\u0ba8\u0bcd\u0ba4\u0bc1 \u0b95\u0ba9\u0bcd\u0ba9\u0bc6\u0b95\u0bcd\u0b9f\u0bcd \u0b89\u0bb1\u0bc1\u0ba4\u0bbf\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0ba4\u0bcd\u0ba4\u0bbf \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0bae\u0bc1\u0baf\u0bb1\u0bcd\u0b9a\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd.',
          pairingHint:
            '\u0baa\u0bb4\u0bc8\u0baf pairing-\u0b90 \u0b87\u0bb0\u0bc1 \u0b9a\u0bbe\u0ba4\u0ba9\u0b99\u0bcd\u0b95\u0bb3\u0bbf\u0bb2\u0bc1\u0bae\u0bcd \u0ba8\u0bc0\u0b95\u0bcd\u0b95\u0bbf, \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd pair \u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bc1 \u0baa\u0bbf\u0bb1\u0b95\u0bc1 \u0bae\u0bc1\u0baf\u0bb1\u0bcd\u0b9a\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd.',
        }
      : {
          connectionFailureTitle: 'Connection Failure',
          wrongBluetoothDeviceTitle: 'Wrong Bluetooth device',
          wrongBluetoothDeviceMessage:
            'Selected device looks like a mobile or laptop. Please choose your POS terminal from the list.',
          genericConnectionMessage:
            'Could not connect to the selected POS. Make sure the POS is nearby, Bluetooth is on, and it is not already connected to another phone.',
          inboundConnectionHint:
            'If your POS expects an incoming connection, open the Bluetooth screen on the POS, confirm connect there, and retry.',
          pairingHint:
            'If needed, remove the old pairing from both devices, pair again, and retry.',
        };
  const formatOasysScaleFrame = useCallback((weight: number) => {
    const padded = weight.toFixed(3).padStart(8, ' ');
    return `ST,GS,${padded}kg${eol}`;
  }, [eol]);

  const deviceRank = useCallback((dev: any) => {
    const name = String(dev?.name ?? '').toLowerCase();
    const majorClass = Number(dev?.deviceClass?.majorClass ?? -1);
    const type = String(dev?.type ?? '').toUpperCase();

    // Only hard-reject if BOTH the Bluetooth class confirms it's a phone/computer
    // AND the device name matches common phone/laptop brands.
    // This prevents blocking real POS terminals that share similar brand names.
    const isPhoneClass = majorClass === 0x0200 || majorClass === 0x0100;
    const isPhoneName = /(iphone|android|samsung|redmi|oppo|vivo|oneplus|realme|pixel|\bmi\b|moto|nokia|laptop|desktop|macbook)/i.test(name);
    if (isPhoneClass && isPhoneName) return -3;

    if (type === 'LOW_ENERGY') return -2;

    let score = 0;
    if (type === 'CLASSIC') score += 2;
    if (/(pos|billing|weigh|scale|printer|pax|verifone|ingenico|newpos|sunmi|castles|wiseasy|terminal)/i.test(name)) score += 3;
    if (majorClass >= 0) score += 1;
    return score;
  }, []);

  const normalizeDiscovered = useCallback((devices: any[]) => {
    const merged = devices.filter(Boolean).filter((dev, index, self) =>
      dev?.address && index === self.findIndex((t) => t?.address === dev.address)
    );

    const filtered = merged.filter((dev) => deviceRank(dev) > -3);
    const usable = filtered.length > 0 ? filtered : merged;

    return usable.sort((a, b) => deviceRank(b) - deviceRank(a));
  }, [deviceRank]);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  // Persistence
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('pos_line_ending');
        if (stored === 'lf' || stored === 'crlf') setLineEnding(stored);

        const storedMode = await AsyncStorage.getItem('pos_connection_mode');
        if (storedMode === 'server' || storedMode === 'client') {
          setConnectionMode('client');
          if (storedMode !== 'client') {
            await AsyncStorage.setItem('pos_connection_mode', 'client');
          }
        }
        
        const storedProto = await AsyncStorage.getItem('pos_weight_protocol');
        if (storedProto === 'oasys_scale' || storedProto === 'sr_prefix') setWeightProtocol(storedProto);
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
    setActivityLog(prev => [newLog, ...prev.slice(0, 19)]);
  }, []);

  const initiateHandshake = useCallback(async (connectedDevice: any) => {
    if (!connectedDevice) return;

    if (weightProtocol !== 'oasys_scale') {
      setIsHeartbeatActive(false);
      return;
    }

    console.log(`[Handshake] Starting OASYS handshake for ${connectedDevice.address}...`);
    let pulseCount = 0;
    const maxPulses = 2;
    const signals = [`EWS${eol}`];

    const sendPulse = async () => {
      if (pulseCount >= maxPulses) {
        console.log('[Handshake] Aggressive sequence finished.');
        setIsHeartbeatActive(true);
        addLog('System', 'EWS Active', 'sent', 'System');
        return;
      }

      try {
        for (const signal of signals) {
          await RNBluetoothClassic.writeToDevice(connectedDevice.address, signal, 'ascii');
          console.log(`[Handshake] Sent pulse ${pulseCount + 1}: ${JSON.stringify(signal)}`);
          await new Promise(resolve => setTimeout(resolve, 180));
        }
        pulseCount++;
        setTimeout(sendPulse, 1200);
      } catch (err) {
        console.error('[Handshake] Pulse failed:', err);
        pulseCount++;
        if (pulseCount < maxPulses) setTimeout(sendPulse, 1200);
      }
    };

    setTimeout(sendPulse, 500);
  }, [addLog, eol, weightProtocol]);

  const isSocketOpen = useCallback(async (address?: string | null) => {
    if (!address) return false;
    try {
      return await RNBluetoothClassic.isDeviceConnected(address);
    } catch {
      return false;
    }
  }, []);

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
        // Some POS devices don't report bonded state correctly. Continue with connect fallbacks.
        console.log('Pair attempt skipped/failed:', pairErr);
      }
    }
  }, []);

  const buildConnectionErrorMessage = useCallback((selectedDevice: any, errors: any[]) => {
    const rawMessages = errors
      .map((error) => (error instanceof Error ? error.message : String(error ?? '')))
      .filter(Boolean);
    const combined = rawMessages.join(' ');
    const label = selectedDevice?.name ? `"${selectedDevice.name}"` : 'the selected POS';

    if (/timed out waiting for pos|unable to accept pos connection/i.test(combined)) {
      return `${copy.genericConnectionMessage} ${copy.inboundConnectionHint}`;
    }

    if (/pair|bond/i.test(combined)) {
      return `${copy.genericConnectionMessage} ${copy.pairingHint}`;
    }

    if (/socket closed immediately|unstable|not connected|broken pipe|closed/i.test(combined)) {
      return `Bluetooth connected to ${label}, but the POS closed the connection immediately. ${copy.inboundConnectionHint}`;
    }

    return `${copy.genericConnectionMessage} ${copy.inboundConnectionHint}`;
  }, [copy.genericConnectionMessage, copy.inboundConnectionHint, copy.pairingHint]);

  const acceptWithFallback = useCallback(
    async (expectedAddress?: string) => {
      const candidates = [
        {
          acceptorType: 'rfcomm',
          connectionType: 'delimited',
          delimiter: eol,
          charset: 'ascii',
          secure: false,
          connectionUuid: SPP_UUID,
          serviceName: 'BMI_POS_LINK',
        },
        {
          acceptorType: 'rfcomm',
          connectionType: 'delimited',
          delimiter: eol,
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
            }, 20000);
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
          const socketOpen = await isSocketOpen(connectedDevice.address);
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
    [eol, isSocketOpen, resolveConnectedDevice]
  );

  const connectWithFallback = useCallback(
    async (address: string, fallbackDevice?: any) => {
      const candidates = [
        {
          connectorType: 'rfcomm',
          connectionType: 'delimited',
          delimiter: eol,
          charset: 'ascii',
          secure: false,
          connectionUuid: SPP_UUID,
        },
        {
          connectorType: 'rfcomm',
          connectionType: 'delimited',
          delimiter: eol,
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

      const alreadyConnected = await isSocketOpen(address);
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
    [eol, isSocketOpen, resolveConnectedDevice]
  );

  const writeToConnectedDevice = useCallback(async (connectedDevice: any, payload: string) => {
    if (!connectedDevice?.address) {
      throw new Error('Missing connected POS address.');
    }

    const address = connectedDevice.address;
    const writers = [
      async () => RNBluetoothClassic.writeToDevice(address, payload, 'ascii'),
      async () => {
        if (typeof connectedDevice?.write !== 'function') return false;
        return connectedDevice.write(payload, 'ascii');
      },
    ];

    let lastErr: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      for (const write of writers) {
        try {
          const written = await write();
          if (written !== false) {
            const stillOpen = await isSocketOpen(address);
            if (stillOpen) return true;
          }
        } catch (err) {
          lastErr = err;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    if (lastErr) throw lastErr;
    throw new Error('Bluetooth write failed.');
  }, [isSocketOpen]);

  const verifyConnectedDevice = useCallback(async (connectedDevice: any) => {
    if (!connectedDevice?.address) return false;

    const address = connectedDevice.address;
    const socketOpen = await isSocketOpen(address);
    if (!socketOpen) return false;

    try {
      if (weightProtocol === 'oasys_scale') {
        await writeToConnectedDevice(connectedDevice, formatOasysScaleFrame(0));
        await new Promise((resolve) => setTimeout(resolve, 120));
      } else {
        // For SR/POS protocol, avoid noisy probes that can destabilize older terminals.
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      return await isSocketOpen(address);
    } catch (err) {
      console.log('Connection probe failed:', err);
      return false;
    }
  }, [formatOasysScaleFrame, isSocketOpen, weightProtocol, writeToConnectedDevice]);

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
        const isConnected = await isSocketOpen(address);
        if (isConnected) {
          const connectedDevice = await RNBluetoothClassic.getConnectedDevices();
          const match = connectedDevice.find(d => d.address === address);
          if (match) {
            const verified = await verifyConnectedDevice(match);
            if (verified) {
              setDevice(match);
              setConnectionStatus('connected');
              initiateHandshake(match);
              return;
            }
            await AsyncStorage.removeItem('last_device_address').catch(() => null);
          }
        }

        // Do not auto-initiate a new socket here; only restore if it's already connected.
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
  }, [ensureBluetoothReady, initiateHandshake, isSocketOpen, verifyConnectedDevice]);

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
    if (Platform.OS === 'web' || !selectedDevice?.address) return false;

    if (deviceRank(selectedDevice) <= -3) {
      Alert.alert(
        copy.wrongBluetoothDeviceTitle,
        copy.wrongBluetoothDeviceMessage
      );
      return false;
    }

    const ready = await ensureBluetoothReady(false);
    if (!ready) {
      setConnectionStatus('notConnected');
      return false;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnectionStatus('connecting');
    // Stop any ongoing discovery so we can open a data socket
    await RNBluetoothClassic.cancelDiscovery().catch(() => false);
    setIsScanning(false);
    try {
      await ensurePaired(selectedDevice);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Always try direct client (outbound) connection first.
      // The server/accept fallback requires the POS to initiate, which most POS
      // billing terminals do NOT do — they wait for the phone to connect.
      let connectedDeviceObj: any = null;
      const errors: any[] = [];

      try {
        connectedDeviceObj = await connectWithFallback(selectedDevice.address, selectedDevice);
      } catch (err) {
        errors.push(err);
        console.log('CLIENT connection attempt failed:', err);
      }

      // Only fall back to server/accept mode if direct connect completely failed.
      if (!connectedDeviceObj) {
        try {
          connectedDeviceObj = await acceptWithFallback(selectedDevice.address);
        } catch (err) {
          errors.push(err);
          console.log('SERVER accept attempt failed:', err);
        }
      }

      if (connectedDeviceObj) {
        const verified = await verifyConnectedDevice(connectedDeviceObj);
        if (!verified) {
          throw new Error('Connected socket is unstable. Please reconnect from POS and try again.');
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        manualDisconnectRef.current = false;
        heartbeatFailCountRef.current = 0;
        setDevice(connectedDeviceObj);
        setConnectionStatus('connected');
        saveLastDevice(connectedDeviceObj.address);
        initiateHandshake(connectedDeviceObj);
        return true;
      } else {
        throw errors[0] || new Error(buildConnectionErrorMessage(selectedDevice, errors));
      }
    } catch (err: any) {
      console.error('Final Connection error:', err);
      await RNBluetoothClassic.cancelAccept().catch(() => false);
      setDevice(null);
      setConnectionStatus('notConnected');
      setIsHeartbeatActive(false);
      setIsAccepting(false);
      Alert.alert(
        copy.connectionFailureTitle,
        buildConnectionErrorMessage(selectedDevice, [err])
      );
      return false;
    } finally {
      setIsAccepting(false);
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
      setDiscoveredDevices(normalizeDiscovered(bondedDevices));
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(prev => normalizeDiscovered([...prev, ...devices]));
    } catch (err) {
      console.error(err);
      Alert.alert('Discovery failed', 'Could not scan for Bluetooth devices. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const sendWeight = async (weight: string | number, userId?: string) => {
    if (!device) return;
    const weightValRaw = String(weight);
    const parsedWeight = typeof weight === 'number' ? weight : parseFloat(weightValRaw);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSending(true);
    try {
      let payload = '';
      let logWeight = weightValRaw;
      let logMode: 'oasys_scale' | 'selling' | 'remaining' = weightMode;

      if (weightProtocol === 'oasys_scale') {
        const numeric = Number(weightValRaw.trim().replace(',', '.'));
        if (isNaN(numeric)) throw new Error('Invalid weight');
        const frame = formatOasysScaleFrame(numeric);
        setLastScaleFrame(frame);
        payload = frame;
        logWeight = String(numeric);
        logMode = 'oasys_scale';
      } else {
        const normalized = weightValRaw.trim().replace(',', '.');
        if (!normalized || isNaN(Number(normalized))) throw new Error('Invalid weight');
        // POS billing terminals expect a plain numeric value terminated with CRLF.
        // e.g. "5.00\r\n" — this is the standard format most billing terminals read.
        const formatted = parseFloat(normalized).toFixed(2);
        payload = `${formatted}\r\n`;
        logMode = weightMode;
      }

      // Critical path: send to POS first, then unlock UI immediately.
      const socketReady = await isSocketOpen(device.address);
      if (!socketReady) {
        setDevice(null);
        setConnectionStatus('notConnected');
        setIsHeartbeatActive(false);
        throw new Error('POS connection is closed. Please reconnect and send again.');
      }

      await writeToConnectedDevice(device, payload);
      heartbeatFailCountRef.current = 0;
      addLog(
        logMode === 'oasys_scale' ? 'Scale' : (weightMode === 'selling' ? 'Selling' : 'Remaining'),
        logWeight,
        'sent',
        logMode
      );
      setIsSending(false);

      // Non-critical path: persist log in Firestore without blocking next send.
      if (userId) {
        firestore.collection('weight_history').add({
          userId,
          weight: parsedWeight,
          mode: weightMode,
          timestamp: serverTimestamp(),
          status: 'sent',
          protocol: weightProtocol
        }).catch((fErr: any) => {
          console.error('Firestore log failed:', fErr);
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Send weight failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (/not connected|socket|closed|broken pipe/i.test(message)) {
        setDevice(null);
        setConnectionStatus('notConnected');
        setIsHeartbeatActive(false);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addLog('Error', String(weightValRaw), 'failed', 'Error');
      setIsSending(false);
    }
  };

  // Heartbeat
  useEffect(() => {
    let interval: any;
    if (connectionStatus === 'connected' && isHeartbeatActive && device && weightProtocol === 'oasys_scale') {
      interval = setInterval(async () => {
        try {
          const frame = lastScaleFrame || formatOasysScaleFrame(0);
          await writeToConnectedDevice(device, frame);
          heartbeatFailCountRef.current = 0;
        } catch {
          heartbeatFailCountRef.current += 1;
          if (heartbeatFailCountRef.current >= 3) {
            setDevice(null);
            setConnectionStatus('notConnected');
            setIsHeartbeatActive(false);
          }
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [connectionStatus, device, formatOasysScaleFrame, isHeartbeatActive, lastScaleFrame, weightProtocol, writeToConnectedDevice]);

  useEffect(() => {
    return () => {
      void RNBluetoothClassic.cancelAccept().catch(() => false);
    };
  }, []);

  // Device disconnect listener keeps UI state aligned with actual socket state.
  useEffect(() => {
    const onDeviceDisconnected = (RNBluetoothClassic as any).onDeviceDisconnected?.((event: any) => {
      const disconnectedAddress = event?.device?.address;
      if (!device?.address || disconnectedAddress !== device.address) return;
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
  }, [addLog, device?.address]);

  // Read listener
  useEffect(() => {
    if (!device?.address || connectionStatus !== 'connected') return;
    const onDataReceived = (RNBluetoothClassic as any).onDeviceRead(device.address, (event: any) => {
      const dataStr = typeof event?.data === 'string' ? event.data : String(event?.data ?? '');
      addLog('POS >>', dataStr, 'sent', 'POS');
    });
    return () => onDataReceived?.remove?.();
  }, [device?.address, connectionStatus, addLog]);

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
  };
}
