import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
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
import Animated, { FadeInUp } from 'react-native-reanimated';

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
  const [activityLog, setActivityLog] = useState<any[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const t = translations[lang];

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const init = async () => {
      await requestPermissions();
      checkLastDevice();
    };
    init();

    const onConnected = RNBluetoothClassic.onDeviceConnected((event) => {
      setConnectionStatus('connected');
      setDevice(event.device);
      saveLastDevice(event.device.address);
    });

    const onDisconnected = RNBluetoothClassic.onDeviceDisconnected((event) => {
      setConnectionStatus('notConnected');
      setDevice(null);
    });

    return () => {
      onConnected.remove();
      onDisconnected.remove();
    };
  }, []);

  const saveLastDevice = async (address: string) => {
    try {
      await AsyncStorage.setItem('last_device_address', address);
    } catch (e) {
      console.error('Failed to save last device', e);
    }
  };

  const checkLastDevice = async () => {
    try {
      const address = await AsyncStorage.getItem('last_device_address');
      if (address) {
        setConnectionStatus('connecting');

        // Use a more robust connection check
        const isConnected = await RNBluetoothClassic.isDeviceConnected(address);
        if (isConnected) {
          const connectedDevice = await RNBluetoothClassic.getConnectedDevices();
          const match = connectedDevice.find(d => d.address === address);
          if (match) {
            setDevice(match);
            setConnectionStatus('connected');
            return;
          }
        }

        const connected = await RNBluetoothClassic.connectToDevice(address, {
          connectorType: 'rfcomm',
          secure: false,
          connectionUuid: SPP_UUID,
        });

        if (connected) {
          // Device state will be updated by listener or if not, we set it here
          const devices = await RNBluetoothClassic.getConnectedDevices();
          const currentDevice = devices.find(d => d.address === address);
          if (currentDevice) {
            setDevice(currentDevice);
            setConnectionStatus('connected');
          }
        } else {
          setConnectionStatus('notConnected');
        }
      }
    } catch (e) {
      console.error('Auto-connect failed', e);
      setConnectionStatus('notConnected');
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'web') return true;
    if (Platform.OS === 'android') {
      try {
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
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

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
        Alert.alert('Error', 'Bluetooth permissions are required.');
        setIsScanning(false);
        return;
      }

      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        Alert.alert('Error', 'Please turn on Bluetooth.');
        setIsScanning(false);
        setModalVisible(false);
        return;
      }

      // 1. Get already paired devices first (usually faster and more reliable)
      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      setDiscoveredDevices(bondedDevices);

      // 2. Start discovery for new devices
      const devices = await RNBluetoothClassic.startDiscovery();

      // Merge unique devices
      setDiscoveredDevices(prev => {
        const all = [...prev, ...devices];
        const unique = all.filter((dev, index, self) =>
          index === self.findIndex((t) => t.address === dev.address)
        );
        return unique;
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to scan for devices.');
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (selectedDevice: any) => {
    if (Platform.OS === 'web') return;
    setModalVisible(false);
    setConnectionStatus('connecting');
    try {
      // 1. Ensure any previous connection to THIS device is closed
      const isConnected = await selectedDevice.isConnected();
      if (isConnected) {
        await selectedDevice.disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 2. Cancel discovery before connecting for better success rate
      await RNBluetoothClassic.cancelDiscovery();
      // 3. Small delay after canceling discovery (allows hardware to reset)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Try connecting with RFCOMM and SPP UUID
      console.log(`Attempting connection to ${selectedDevice.address} with SPP UUID...`);
      let connected = false;
      try {
        connected = await selectedDevice.connect({
          connectorType: 'rfcomm',
          secure: false,
          connectionUuid: SPP_UUID,
        });
      } catch (e) {
        console.log('SPP connection failed, trying generic fallback...');
        await new Promise(resolve => setTimeout(resolve, 500));
        connected = await selectedDevice.connect();
      }

      if (connected) {
        setDevice(selectedDevice);
        setConnectionStatus('connected');
        saveLastDevice(selectedDevice.address);
      } else {
        setConnectionStatus('notConnected');
        Alert.alert('Failed', 'Could not connect. Please ensure device is paired in your phone Bluetooth settings.');
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setConnectionStatus('notConnected');

      // Provide more helpful error messages based on the exception
      let errorMsg = err.message || 'An error occurred.';
      if (errorMsg.includes('read failed')) {
        errorMsg = 'Connection reset by POS machine. Please restart the POS Bluetooth or unpair/repair the device.';
      } else if (errorMsg.includes('Service discovery failed')) {
        errorMsg = 'Could not find POS service. Ensure the machine is in SPP/Serial mode.';
      }

      Alert.alert('Connection Error', errorMsg);
    }
  };
  const sendWeight = async (weight: string | number) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Sending data is only available on physical devices.');
      return;
    }
    if (!device) {
      Alert.alert('Error', t.notConnected);
      return;
    }

    const weightVal = typeof weight === 'string' ? weight : weight.toString();
    const time = new Date().toLocaleTimeString();

    try {
      await device.write(`${weightVal}\n`);
      const newLog = {
        id: Date.now(),
        weight: weightVal,
        time,
        status: 'sent'
      };
      setActivityLog([newLog, ...activityLog.slice(0, 9)]);
      if (typeof weight === 'string') setManualWeight('');
    } catch (err) {
      const newLog = {
        id: Date.now(),
        weight: weightVal,
        time,
        status: 'failed'
      };
      setActivityLog([newLog, ...activityLog.slice(0, 9)]);
      Alert.alert('Error', 'Failed to send data.');
    }
  };

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'ta' : 'en');
  };

  const renderWeightButton = ({ item }: { item: number }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.weightButton}
      onPress={() => sendWeight(item)}
    >
      <Text style={styles.weightButtonText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a237e" />

        {/* Animated Background Header */}
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
          {/* Action Area */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.actionContainer}>
            <TouchableOpacity onPress={startDiscovery}>
              <LinearGradient
                colors={['#4caf50', '#388e3c']}
                style={styles.connectBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.connectBtnText}>{t.connectBtn}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Manual Input Section */}
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
                >
                  {t.send}
                </Button>
              </Card.Content>
            </Card>
          </Animated.View>

          {/* Quick Selection Title */}
          <View style={styles.labelContainer}>
            <Text style={styles.sectionLabel}>{t.selectWeight}</Text>
          </View>

          {/* Weight Grid */}
          <Animated.View entering={FadeInUp.delay(400)} style={styles.gridContainer}>
            <FlatList
              data={WEIGHTS}
              renderItem={renderWeightButton}
              keyExtractor={(item) => item.toString()}
              numColumns={4}
              scrollEnabled={false}
            />
          </Animated.View>

          {/* Activity Log */}
          <View style={styles.labelContainer}>
            <Text style={styles.sectionLabel}>{t.log}</Text>
          </View>
          <Card style={styles.logCard}>
            {activityLog.length === 0 ? (
              <Text style={styles.noLogText}>{t.noLog}</Text>
            ) : (
              activityLog.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <Text style={styles.logText}>{log.weight} kg</Text>
                  <Text style={styles.logTime}>{log.time}</Text>
                  <Text style={[styles.logStatus, { color: log.status === 'sent' ? '#4caf50' : '#f44336' }]}>
                    {t[log.status as keyof typeof t]}
                  </Text>
                </View>
              ))
            )}
          </Card>

          {/* Instructions Box */}
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

        {/* Discovery Modal */}
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
    fontWeight: '700',
    color: '#2c3e50',
  },
  gridContainer: {
    marginBottom: 20,
  },
  weightButton: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 4,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  weightButtonText: {
    color: '#1a237e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logCard: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 25,
    elevation: 1,
    backgroundColor: '#fff',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  logText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  logTime: {
    fontSize: 12,
    color: '#999',
  },
  logStatus: {
    fontSize: 12,
    fontWeight: '700',
    width: 60,
    textAlign: 'right',
  },
  noLogText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  instructionCard: {
    backgroundColor: '#f1f8e9',
    borderRadius: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#4caf50',
    elevation: 0,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  instructionList: {
    marginLeft: 5,
  },
  instructionItem: {
    fontSize: 14,
    color: '#388e3c',
    marginBottom: 4,
    fontWeight: '500',
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
});
