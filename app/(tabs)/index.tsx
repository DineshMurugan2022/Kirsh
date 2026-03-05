// VERSION_V2_BRUTAL_DIAGNOSTICS
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { Button, Card, Divider, List, Modal, PaperProvider, Portal } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

// Standard SPP UUID for POS/Serial communication
const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';

// Weights for the grid
const WEIGHTS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 45, 50, 60,
];

// Simple Localization
const translations = {
  en: {
    title: 'BMI APP',
    status: 'Status',
    notConnected: 'Not Connected',
    connecting: 'Connecting...',
    connected: 'Connected',
    connectBtn: 'CONNECT TO POS',
    selectWeight: 'Select Weight (kg)',
    manualInput: 'Manual Weight',
    send: 'SEND',
    instructions: 'Instructions',
    step1: '1. Click CONNECT',
    step2: '2. Allow Bluetooth discovery',
    step3: '3. Connect from POS machine',
    step4: '4. Select weight to send',
    log: 'Recent Activity',
    sent: 'Sent',
    failed: 'Failed',
    noLog: 'No activity yet',
    disconnect: 'DISCONNECT',
    selling: 'Selling Amount',
    remaining: 'Remaining Amount',
    mode: 'Mode',
  },
  ta: {
    title: 'BMI செயலி',
    status: 'நிலை',
    notConnected: 'இணைக்கப்படவில்லை',
    connecting: 'இணைக்கப்படுகிறது...',
    connected: 'இணைக்கப்பட்டது',
    connectBtn: 'POS-உடன் இணைக்கவும்',
    selectWeight: 'எடையைத் தேர்ந்தெடுக்கவும் (கி.கி)',
    manualInput: 'கைமுறையாக உள்ளிடவும்',
    send: 'அனுப்புக',
    instructions: 'வழிமுறைகள்',
    step1: '1. CONNECT பொத்தானை அழுத்தவும்',
    step2: '2. ப்ளூடூத் அனுமதியை வழங்கவும்',
    step3: '3. POS இயந்திரத்திலிருந்து இணைக்கவும்',
    step4: '4. அனுப்ப வேண்டிய எடையைத் தேர்ந்தெடுக்கவும்',
    log: 'சமீபத்திய செயல்பாடு',
    sent: 'அனுப்பப்பட்டது',
    failed: 'தோல்வி',
    noLog: 'சமீபத்திய செயல்பாடு இல்லை',
    disconnect: 'இணைப்பைத் துண்டி',
    selling: 'விற்பனை அளவு',
    remaining: 'மீத அளவு',
    mode: 'முறை',
  },

};

export default function HomeScreen() {
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [device, setDevice] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('notConnected');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualWeight, setManualWeight] = useState('');
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [weightMode, setWeightMode] = useState<'selling' | 'remaining'>('selling');

  const scrollRef = useRef<ScrollView>(null);
  const connectionStatusRef = useRef(connectionStatus);
  const manualDisconnectRef = useRef(false);
  const t = translations[lang];

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  // Activity Log helper
  const addLog = useCallback((tag: string, weight: string, status: string) => {
    const time = new Date().toLocaleTimeString();
    const newLog = {
      id: Date.now(),
      weight: tag === 'POS >>' ? tag : `${weight} kg`,
      time,
      status, // 'sent' or 'failed'
      mode: tag === 'POS >>' ? weight : weightMode,
    };
    setActivityLog(prev => [newLog, ...prev.slice(0, 19)]);
  }, [weightMode]);

  // Aggressive Handshake Logic for POS/OASYS
  const initiateHandshake = useCallback(async (connectedDevice: any) => {
    if (!connectedDevice) return;

    console.log(`[Handshake] Starting aggressive EWS sequence for ${connectedDevice.address}...`);
    let pulseCount = 0;
    const maxPulses = 5; // Increased pulses
    const signals = ['EWS\n', 'READY\n', '\n']; // Simplified to \n and prioritized EWS

    const sendPulse = async () => {
      if (pulseCount >= maxPulses) {
        console.log('[Handshake] Aggressive sequence finished.');
        setIsHeartbeatActive(true);
        addLog('System', 'EWS Active', 'sent');
        return;
      }

      try {
        for (const signal of signals) {
          await RNBluetoothClassic.writeToDevice(connectedDevice.address, signal);
          console.log(`[Handshake] Sent pulse ${pulseCount + 1}: ${JSON.stringify(signal)}`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        pulseCount++;
        setTimeout(sendPulse, 2000); // Repeat pulse every 2 seconds
      } catch (err) {
        console.error('[Handshake] Pulse failed:', err);
        pulseCount++;
        if (pulseCount < maxPulses) setTimeout(sendPulse, 2000);
      }
    };

    // Start handshake
    setTimeout(sendPulse, 500);
  }, [addLog]);

  const resolveConnectedDevice = useCallback(async (address: string, fallback?: any) => {
    if (fallback && typeof fallback === 'object' && fallback.address) {
      return fallback;
    }

    try {
      const direct = await (RNBluetoothClassic as any).getConnectedDevice?.(address);
      if (direct?.address) {
        return direct;
      }
    } catch (e) {
      console.log('getConnectedDevice fallback failed:', e);
    }

    const devices = await RNBluetoothClassic.getConnectedDevices();
    return devices.find((d: any) => d?.address === address) ?? null;
  }, []);

  // Persist last device
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

  const requestPermissions = async () => {
    if (Platform.OS === 'web') return true;
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Number(Platform.Version);
        if (apiLevel >= 31) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          return (
            granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          return granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('Permission request failed:', err);
        return false;
      }
    }
    return true;
  };

  // Persistent connect/disconnect listeners
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const init = async () => {
      await requestPermissions();
      checkLastDevice();
    };
    init();

    const onConnected = RNBluetoothClassic.onDeviceConnected((event: any) => {
      const nextDevice = event?.device ?? event;
      if (!nextDevice?.address) {
        console.log('onDeviceConnected received invalid event:', event);
        return;
      }
      manualDisconnectRef.current = false;
      console.log('Event: onDeviceConnected', nextDevice.address);
      setConnectionStatus('connected');
      setDevice(nextDevice);
      saveLastDevice(nextDevice.address);
      initiateHandshake(nextDevice);
    });

    const onDisconnected = RNBluetoothClassic.onDeviceDisconnected(() => {
      setConnectionStatus('notConnected');
      setDevice(null);
      setIsHeartbeatActive(false);
      // Attempt reconnect only for unexpected disconnects.
      if (manualDisconnectRef.current) {
        manualDisconnectRef.current = false;
        return;
      }
      setTimeout(() => checkLastDevice(), 3000);
    });

    return () => {
      onConnected.remove();
      onDisconnected.remove();
    };
  }, [checkLastDevice, initiateHandshake]);

  // Per-device read listener
  useEffect(() => {
    if (Platform.OS === 'web' || !device?.address || connectionStatus !== 'connected') {
      return;
    }

    const onDataReceived = (RNBluetoothClassic as any).onDeviceRead(device.address, (event: any) => {
      console.log('Bluetooth Data Received:', event);
      const dataStr = typeof event?.data === 'string' ? event.data : String(event?.data ?? event ?? '');
      addLog('POS >>', dataStr, 'sent');
    });

    return () => {
      onDataReceived?.remove?.();
    };
  }, [device?.address, connectionStatus, addLog]);

  // Background auto-connect timer (every 30s if not connected)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const autoConnectTimer = setInterval(() => {
      if (connectionStatusRef.current === 'notConnected') {
        checkLastDevice();
      }
    }, 30000);

    return () => clearInterval(autoConnectTimer);
  }, [checkLastDevice]);

  // Heartbeat mechanism - Critical for OASYS staying "Connected"
  useEffect(() => {
    let interval: any;
    if (connectionStatus === 'connected' && isHeartbeatActive && device) {
      interval = setInterval(async () => {
        try {
          // Send EWS pulse instead of just newline to maintain machine-side status
          await RNBluetoothClassic.writeToDevice(device.address, 'EWS\n');
        } catch (error) {
          console.error('Heartbeat failed:', error);
          setIsHeartbeatActive(false);
        }
      }, 3000); // Every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus, device, isHeartbeatActive]);

  const startDiscovery = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Bluetooth is only available on physical devices.');
      return;
    }
    setIsScanning(true);
    setModalVisible(true);
    try {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('DIAGNOSTIC_PERMISSION_ERROR', 'Bluetooth permissions are required.');
        setIsScanning(false);
        return;
      }

      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        Alert.alert('DIAGNOSTIC_BT_OFF', 'Please turn on Bluetooth.');
        setIsScanning(false);
        setModalVisible(false);
        return;
      }

      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      setDiscoveredDevices(bondedDevices);

      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(prev => {
        const all = [...prev, ...devices];
        const unique = all.filter((dev, index, self) =>
          index === self.findIndex((t) => t.address === dev.address)
        );
        return unique;
      });
    } catch (err) {
      console.error(err);
      Alert.alert('DIAGNOSTIC_DISCOVERY_CATCH', 'Failed to scan for devices.');
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (selectedDevice: any) => {
    if (Platform.OS === 'web' || isScanning) return;

    const enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!enabled) {
      Alert.alert('Bluetooth Off', 'Please turn on Bluetooth before connecting.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(false);
    setConnectionStatus('connecting');
    setIsScanning(true);
    try {
      try {
        const isConnected = await selectedDevice.isConnected();
        if (isConnected) {
          await selectedDevice.disconnect();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e) {
        console.log('Pre-connect cleanup failed:', e);
      }

      try {
        await RNBluetoothClassic.cancelDiscovery();
      } catch (e) {
        console.log('Cancel discovery failed:', e);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log(`Attempting unified connection to ${selectedDevice.address}...`);

      const conn = await RNBluetoothClassic.connectToDevice(selectedDevice.address, {
        connectorType: 'rfcomm',
        secure: false, // Insecure helps POS connections initial handshake
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
      Alert.alert('Connection Failure', err.message || 'Failed to connect. Check machine state.');
    } finally {
      setIsScanning(false);
    }
  };

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

  const sendWeight = async (weight: string | number) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Sending data is only available on physical devices.');
      return;
    }
    if (!device) {
      Alert.alert('DIAGNOSTIC_SEND_NO_DEVICE', t.notConnected);
      return;
    }

    const weightVal = typeof weight === 'string' ? weight : weight.toString();
    const modePrefix = weightMode === 'selling' ? 'S:' : 'R:';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSending(true);
    try {
      if (device) {
        await RNBluetoothClassic.writeToDevice(device.address, `${modePrefix}${weightVal}\n`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addLog(weightMode === 'selling' ? 'Selling' : 'Remaining', weightVal, 'sent');
        if (typeof weight === 'string') setManualWeight('');
      }
    } catch (err) {
      console.error('Send weight failed:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addLog(weightMode === 'selling' ? 'Selling' : 'Remaining', weightVal, 'failed');
      Alert.alert('DIAGNOSTIC_SEND_CATCH', 'Failed to send data. Check Bluetooth connection.');
    } finally {
      setIsSending(false);
    }
  };

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'ta' : 'en');
  };

  const renderWeightButton = ({ item, index }: { item: number, index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 20)} key={item.toString()}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.weightButton}
        onPress={() => sendWeight(item)}
        disabled={isSending || connectionStatus !== 'connected'}
      >
        <Text style={[styles.weightButtonText, (isSending || connectionStatus !== 'connected') && { color: '#999' }]}>{item}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a237e" />

        <LinearGradient
          colors={['#1a237e', '#3949ab']}
          style={styles.topGradient}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>{t.title}</Text>
              <Text style={styles.headerStatusText}>
                {t.status}: <Text style={{ fontWeight: 'bold', color: connectionStatus === 'connected' ? '#4caf50' : '#ffc107' }}>
                  {t[connectionStatus as keyof typeof t]}
                </Text>
              </Text>
            </View>
            <Button
              mode="outlined"
              onPress={toggleLanguage}
              textColor="#fff"
              style={{ borderColor: '#fff', borderRadius: 20 }}
              compact
            >
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </Button>
          </View>
        </LinearGradient>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(200)} style={styles.actionContainer}>
            {connectionStatus === 'connected' ? (
              <TouchableOpacity onPress={disconnectDevice}>
                <LinearGradient
                  colors={['#f44336', '#d32f2f']}
                  style={styles.connectBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.connectBtnText}>{t.disconnect}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={startDiscovery}>
                <LinearGradient
                  colors={['#4caf50', '#388e3c']}
                  style={styles.connectBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.connectBtnText}>{isScanning ? t.connecting : t.connectBtn}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {connectionStatus === 'connected' && (
              <Animated.View entering={FadeInDown.delay(300)} style={styles.modeContainer}>
                <Text style={styles.modeLabel}>{t.mode}:</Text>
                <View style={styles.modeToggleGroup}>
                  <TouchableOpacity
                    style={[styles.modeToggle, weightMode === 'selling' && styles.modeToggleActive]}
                    onPress={() => setWeightMode('selling')}
                  >
                    <Text style={[styles.modeToggleText, weightMode === 'selling' && styles.modeToggleTextActive]}>
                      {t.selling}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeToggle, weightMode === 'remaining' && styles.modeToggleActive]}
                    onPress={() => setWeightMode('remaining')}
                  >
                    <Text style={[styles.modeToggleText, weightMode === 'remaining' && styles.modeToggleTextActive]}>
                      {t.remaining}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            <Card style={styles.manualCard}>
              <Card.Content style={styles.manualContent}>
                <TextInput
                  placeholder={t.manualInput}
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  value={manualWeight}
                  onChangeText={setManualWeight}
                />
                <Button
                  mode="contained"
                  onPress={() => sendWeight(manualWeight)}
                  style={styles.manualSendBtn}
                  loading={isSending}
                  disabled={isSending || !manualWeight || connectionStatus !== 'connected'}
                >
                  {t.send}
                </Button>
              </Card.Content>
            </Card>
          </Animated.View>

          <View style={styles.labelContainer}>
            <Text style={styles.sectionLabel}>{t.selectWeight}</Text>
          </View>

          <View style={styles.gridContainer}>
            <FlatList
              data={WEIGHTS}
              renderItem={renderWeightButton}
              keyExtractor={(item) => item.toString()}
              numColumns={4}
              scrollEnabled={false}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
            />
          </View>

          <View style={styles.labelContainer}>
            <Text style={styles.sectionLabel}>{t.log}</Text>
          </View>
          <Card style={styles.logCard}>
            {activityLog.length === 0 ? (
              <Text style={styles.noLogText}>{t.noLog}</Text>
            ) : (
              <Animated.View layout={Layout.springify()}>
                {activityLog.map((log) => (
                  <Animated.View
                    entering={FadeInDown}
                    key={log.id}
                    style={styles.logItem}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logText}>{log.weight}</Text>
                      <Text style={styles.logModeText}>{t[log.mode as keyof typeof t]}</Text>
                    </View>
                    <Text style={styles.logTime}>{log.time}</Text>
                    <Text style={[styles.logStatus, { color: log.status === 'sent' ? '#4caf50' : '#f44336' }]}>
                      {t[log.status as keyof typeof t]}
                    </Text>
                  </Animated.View>
                ))}
              </Animated.View>
            )}
          </Card>

          <Card style={styles.instructionCard}>
            <Card.Content>
              <Text style={styles.instructionTitle}>{t.instructions}:</Text>
              <View style={styles.instructionList}>
                <Text style={styles.instructionItem}>{t.step1}</Text>
                <Text style={styles.instructionItem}>{t.step2}</Text>
                <Text style={styles.instructionItem}>{t.step3}</Text>
                <Text style={styles.instructionItem}>{t.step4}</Text>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>

        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Select Device</Text>
            <Divider />
            {isScanning ? (
              <Text style={styles.scanningText}>Scanning...</Text>
            ) : discoveredDevices.length === 0 ? (
              <Text style={styles.scanningText}>No devices found.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {discoveredDevices.map((d, index) => (
                  <List.Item
                    key={index}
                    title={d.name || 'Unknown Device'}
                    description={d.address}
                    onPress={() => connectToDevice(d)}
                    left={(props) => <List.Icon {...props} icon="bluetooth" />}
                  />
                ))}
              </ScrollView>
            )}
            <Button onPress={() => setModalVisible(false)}>Cancel</Button>
          </Modal>
        </Portal>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  topGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#1a237e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerStatusText: {
    fontSize: 14,
    color: '#e8eaf6',
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  actionContainer: {
    marginBottom: 20,
  },
  connectBtnGradient: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  manualCard: {
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
  },
  manualContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 10,
    backgroundColor: '#fafafa',
  },
  manualSendBtn: {
    borderRadius: 8,
    backgroundColor: '#1a237e',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  gridContainer: {
    marginBottom: 20,
  },
  weightButton: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  weightButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3949ab',
  },
  logCard: {
    borderRadius: 12,
    elevation: 2,
    padding: 15,
    marginBottom: 20,
  },
  noLogText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  logModeText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  logTime: {
    fontSize: 12,
    color: '#999',
  },
  logStatus: {
    fontSize: 13,
    fontWeight: 'bold',
    width: 60,
    textAlign: 'right',
  },
  instructionCard: {
    borderRadius: 12,
    backgroundColor: '#e8eaf6',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  instructionList: {
    paddingLeft: 5,
  },
  instructionItem: {
    fontSize: 14,
    color: '#3949ab',
    marginBottom: 5,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#1a237e',
  },
  scanningText: {
    textAlign: 'center',
    marginVertical: 25,
    fontSize: 16,
    color: '#666',
  },
  modeContainer: {
    marginBottom: 15,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginLeft: 4,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 4,
  },
  modeToggle: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeToggleActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modeToggleText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  modeToggleTextActive: {
    color: '#1a237e',
    fontWeight: 'bold',
  },
});
