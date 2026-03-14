import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

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
  const [lineEnding, setLineEnding] = useState<'lf' | 'crlf'>('lf');
  const [connectionMode, setConnectionMode] = useState<'client' | 'server'>('client');
  const [isAccepting, setIsAccepting] = useState(false);
  const [weightProtocol, setWeightProtocol] = useState<'oasys_scale' | 'sr_prefix'>('oasys_scale');
  const [lastScaleFrame, setLastScaleFrame] = useState<string>('');

  const connectionStatusRef = useRef(connectionStatus);
  const manualDisconnectRef = useRef(false);
  const eol = lineEnding === 'crlf' ? '\r\n' : '\n';

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
        if (storedMode === 'client' || storedMode === 'server') setConnectionMode(storedMode);
        
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

    console.log(`[Handshake] Starting aggressive EWS sequence for ${connectedDevice.address}...`);
    let pulseCount = 0;
    const maxPulses = 5;
    const signals = [`EWS${eol}`, `READY${eol}`, eol];

    const sendPulse = async () => {
      if (pulseCount >= maxPulses) {
        console.log('[Handshake] Aggressive sequence finished.');
        setIsHeartbeatActive(true);
        addLog('System', 'EWS Active', 'sent', 'System');
        return;
      }

      try {
        for (const signal of signals) {
          await RNBluetoothClassic.writeToDevice(connectedDevice.address, signal);
          console.log(`[Handshake] Sent pulse ${pulseCount + 1}: ${JSON.stringify(signal)}`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        pulseCount++;
        setTimeout(sendPulse, 2000);
      } catch (err) {
        console.error('[Handshake] Pulse failed:', err);
        pulseCount++;
        if (pulseCount < maxPulses) setTimeout(sendPulse, 2000);
      }
    };

    setTimeout(sendPulse, 500);
  }, [addLog, eol]);

  const resolveConnectedDevice = useCallback(async (address: string, fallback?: any) => {
    if (fallback && typeof fallback === 'object' && fallback.address) return fallback;
    try {
      const direct = await (RNBluetoothClassic as any).getConnectedDevice?.(address);
      if (direct?.address) return direct;
    } catch (e) {
      console.log('getConnectedDevice fallback failed:', e);
    }
    const devices = await RNBluetoothClassic.getConnectedDevices();
    return devices.find((d: any) => d?.address === address) ?? null;
  }, []);

  const saveLastDevice = async (address: string) => {
    try {
      await AsyncStorage.setItem('last_device_address', address);
    } catch (e) {
      console.error('Failed to save last device', e);
    }
  };

  const checkLastDevice = useCallback(async () => {
    try {
      const address = await AsyncStorage.getItem('last_device_address');
      if (address) {
        setConnectionStatus('connecting');
        const isConnected = await RNBluetoothClassic.isDeviceConnected(address);
        if (isConnected) {
          const connectedDevice = await RNBluetoothClassic.getConnectedDevices();
          const match = connectedDevice.find(d => d.address === address);
          if (match) {
            setDevice(match);
            setConnectionStatus('connected');
            initiateHandshake(match);
            return;
          }
        }

        const connected = await RNBluetoothClassic.connectToDevice(address, {
          connectorType: 'rfcomm',
          secure: false,
          connectionUuid: SPP_UUID,
        });

        const currentDevice = await resolveConnectedDevice(address, connected);
        if (currentDevice) {
          setDevice(currentDevice);
          setConnectionStatus('connected');
          initiateHandshake(currentDevice);
        } else {
          setConnectionStatus('notConnected');
        }
      }
    } catch (e) {
      console.error('Auto-connect failed', e);
      setConnectionStatus('notConnected');
    }
  }, [initiateHandshake, resolveConnectedDevice]);

  const disconnectDevice = async () => {
    if (!device) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    manualDisconnectRef.current = true;
    try {
      await RNBluetoothClassic.disconnectFromDevice(device.address);
      setDevice(null);
      setConnectionStatus('notConnected');
    } catch (err) {
      console.error('Disconnect failed', err);
      setDevice(null);
      setConnectionStatus('notConnected');
    }
  };

  const connectToDevice = async (selectedDevice: any) => {
    if (Platform.OS === 'web' || isScanning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnectionStatus('connecting');
    setIsScanning(true);
    try {
      await RNBluetoothClassic.cancelDiscovery();
      await new Promise(resolve => setTimeout(resolve, 1500));
      const conn = await RNBluetoothClassic.connectToDevice(selectedDevice.address, {
        connectorType: 'rfcomm',
        secure: false,
        connectionUuid: SPP_UUID,
      });
      const connectedDeviceObj = await resolveConnectedDevice(selectedDevice.address, conn);
      if (connectedDeviceObj) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        manualDisconnectRef.current = false;
        setDevice(connectedDeviceObj);
        setConnectionStatus('connected');
        saveLastDevice(connectedDeviceObj.address);
        initiateHandshake(connectedDeviceObj);
      } else {
        throw new Error('Device failed to report connected state.');
      }
    } catch (err: any) {
      console.error('Final Connection error:', err);
      setConnectionStatus('notConnected');
      Alert.alert('Connection Failure', err.message || 'Failed to connect.');
    } finally {
      setIsScanning(false);
    }
  };

  const startDiscovery = async () => {
    if (Platform.OS === 'web') return;
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
    } finally {
      setIsScanning(false);
    }
  };

  const formatOasysScaleFrame = useCallback((weight: number) => {
    const padded = weight.toFixed(3).padStart(8, ' ');
    return `ST,GS,${padded}kg${eol}`;
  }, [eol]);

  const sendWeight = async (weight: string | number) => {
    if (!device) return;
    const weightValRaw = String(weight);
    const modePrefix = weightMode === 'selling' ? 'S:' : 'R:';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSending(true);
    try {
      if (weightProtocol === 'oasys_scale') {
        const numeric = Number(weightValRaw.trim().replace(',', '.'));
        if (isNaN(numeric)) throw new Error('Invalid weight');
        const frame = formatOasysScaleFrame(numeric);
        setLastScaleFrame(frame);
        await RNBluetoothClassic.writeToDevice(device.address, frame);
        addLog('Scale', String(numeric), 'sent', 'oasys_scale');
      } else {
        await RNBluetoothClassic.writeToDevice(device.address, `${modePrefix}${weightValRaw}${eol}`);
        addLog(weightMode === 'selling' ? 'Selling' : 'Remaining', weightValRaw, 'sent', weightMode);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Send weight failed:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addLog('Error', String(weightValRaw), 'failed', 'Error');
    } finally {
      setIsSending(false);
    }
  };

  // Heartbeat
  useEffect(() => {
    let interval: any;
    if (connectionStatus === 'connected' && isHeartbeatActive && device) {
      interval = setInterval(async () => {
        try {
          if (weightProtocol === 'oasys_scale') {
            const frame = lastScaleFrame || formatOasysScaleFrame(0);
            await RNBluetoothClassic.writeToDevice(device.address, frame);
          } else {
            await RNBluetoothClassic.writeToDevice(device.address, `EWS${eol}`);
          }
        } catch (error) {
          setIsHeartbeatActive(false);
        }
      }, weightProtocol === 'oasys_scale' ? 1000 : 3000);
    }
    return () => clearInterval(interval);
  }, [connectionStatus, device, formatOasysScaleFrame, isHeartbeatActive, lastScaleFrame, weightProtocol, eol]);

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
