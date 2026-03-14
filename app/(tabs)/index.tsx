// VERSION_V3_SIMPLE_UI
import { firebase } from '@/src/firebase/config';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
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
import { Button, Card, Divider, List, Modal, PaperProvider, Portal } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '@/src/auth/AuthProvider';
import { firestore } from '@/src/firebase/config';
import { useBluetoothManager, LogEntry } from '@/hooks/use-bluetooth';

const WEIGHTS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 45, 50, 60,
];

const translations = {
  en: {
    title: 'BMI APP',
    status: 'Status',
    notConnected: 'Not Connected',
    connecting: 'Connecting...',
    connected: 'Connected',
    connectBtn: 'CONNECT TO POS',
    selectWeight: 'Select Weight (kg):',
    manualInput: 'Manual Weight',
    send: 'SEND',
    instructions: 'Instructions:',
    step1: '1. Click CONNECT',
    step2: '2. Allow Bluetooth discovery',
    step3: '3. Connect from POS machine',
    step4: '4. Select weight to send',
    log: 'Recent Activity',
    sent: 'Sent',
    failed: 'Failed',
    noLog: 'No activity yet',
    disconnect: 'DISCONNECT',
    adminPanel: 'ADMIN PANEL',
  },
  ta: {
    title: 'BMI செயலி',
    status: 'நிலை',
    notConnected: 'இணைக்கப்படவில்லை',
    connecting: 'இணைக்கப்படுகிறது...',
    connected: 'இணைக்கப்பட்டது',
    connectBtn: 'POS-உடன் இணைக்கவும்',
    selectWeight: 'எடையைத் தேர்ந்தெடுக்கவும் (கி.கி):',
    manualInput: 'கைமுறையாக உள்ளிடவும்',
    send: 'அனுப்புக',
    instructions: 'வழிமுறைகள்:',
    step1: '1. CONNECT பொத்தானை அழுத்தவும்',
    step2: '2. ப்ளூடூத் அனுமதியை வழங்கவும்',
    step3: '3. POS சாதனத்திலிருந்து இணைக்கவும்',
    step4: '4. அனுப்ப வேண்டிய எடையைத் தேர்ந்தெடுக்கவும்',
    log: 'சமீபத்திய செயல்பாடு',
    sent: 'அனுப்பப்பட்டது',
    failed: 'தோல்வி',
    noLog: 'சமீபத்திய செயல்பாடு இல்லை',
    disconnect: 'இணைப்பைத் துண்டி',
    adminPanel: 'நிர்வாகப் குழு',
  },
};

export default function HomeScreen() {
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [modalVisible, setModalVisible] = useState(false);
  const [manualWeight, setManualWeight] = useState('');
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const {
    connectionStatus,
    isScanning,
    discoveredDevices,
    activityLog,
    isSending,
    weightMode,
    startDiscovery,
    connectToDevice,
    disconnectDevice,
    sendWeight: originalSendWeight,
  } = useBluetoothManager(lang);

  const t = translations[lang];

  const handleSendWeight = async (weight: string | number) => {
    await originalSendWeight(weight);
    if (user && connectionStatus === 'connected') {
      try {
        await firestore.collection('weight_history').add({
          userId: user.uid,
          weight: typeof weight === 'number' ? weight : parseFloat(weight),
          mode: weightMode,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
        });
      } catch (err) {
        console.error('Failed to save weight to Firestore:', err);
      }
    }
    if (typeof weight === 'string') setManualWeight('');
  };

  const renderWeightButton = ({ item }: { item: number }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.weightButton}
      onPress={() => handleSendWeight(item)}
      disabled={isSending || connectionStatus !== 'connected'}
    >
      <Text style={styles.weightButtonText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Status Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.headerTitle}>{t.title}</Text>
                <Text style={styles.headerStatusText}>
                  {t.status}:{' '}
                  <Text style={{ 
                    fontWeight: 'bold', 
                    color: connectionStatus === 'connected' ? '#4caf50' : '#f44336' 
                  }}>
                    {t[connectionStatus as keyof typeof t]}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.langBubble} onPress={() => setLang(lang === 'en' ? 'ta' : 'en')}>
                <Text style={styles.langText}>{lang === 'en' ? 'தமிழ்' : 'English'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Connect Button */}
          <TouchableOpacity
            style={[styles.connectButton, connectionStatus === 'connected' && { backgroundColor: '#f44336' }]}
            onPress={() => {
              if (connectionStatus === 'connected') disconnectDevice();
              else {
                setModalVisible(true);
                startDiscovery();
              }
            }}
          >
            <Text style={styles.connectButtonText}>
              {connectionStatus === 'connected' ? t.disconnect : (isScanning ? t.connecting : t.connectBtn)}
            </Text>
          </TouchableOpacity>

          {/* Manual Weight Input */}
          <View style={styles.manualEntryCard}>
            <TextInput
              placeholder={t.manualInput}
              style={styles.manualInput}
              keyboardType="decimal-pad"
              value={manualWeight}
              onChangeText={setManualWeight}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!manualWeight || connectionStatus !== 'connected') && { opacity: 0.5 }]} 
              onPress={() => handleSendWeight(manualWeight)}
              disabled={!manualWeight || connectionStatus !== 'connected'}
            >
              <Text style={styles.sendButtonText}>{t.send}</Text>
            </TouchableOpacity>
          </View>

          {/* Weight Selection Grid */}
          <Text style={styles.sectionTitle}>{t.selectWeight}</Text>
          <View style={styles.gridWrapper}>
            <FlatList
              data={WEIGHTS}
              renderItem={renderWeightButton}
              keyExtractor={(item) => item.toString()}
              numColumns={4}
              scrollEnabled={false}
              columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 10 }}
            />
          </View>

          {/* Recent Activity Log */}
          {activityLog.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t.log}</Text>
              <Card style={styles.logCard}>
                {activityLog.map((log: LogEntry) => (
                  <View key={log.id} style={styles.logItem}>
                    <Text style={styles.logText}>{log.weight} kg</Text>
                    <Text style={styles.logTime}>{log.time}</Text>
                    <Text style={[styles.logStatus, { color: log.status === 'sent' ? '#4caf50' : '#f44336' }]}>
                      {t[log.status as keyof typeof t]}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Instructions Box */}
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>{t.instructions}</Text>
            <Text style={styles.instructionText}>{t.step1}</Text>
            <Text style={styles.instructionText}>{t.step2}</Text>
            <Text style={styles.instructionText}>{t.step3}</Text>
            <Text style={styles.instructionText}>{t.step4}</Text>
          </View>
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
                    onPress={() => {
                      connectToDevice(d);
                      setModalVisible(false);
                    }}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 15 },
  adminButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  adminButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 5 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' },
    }),
    marginBottom: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  headerStatusText: { fontSize: 16, color: '#666', marginTop: 5 },
  langBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3f51b5',
    backgroundColor: '#3f51b5',
  },
  langText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  connectButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#4caf50', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 4px rgba(76, 175, 80, 0.3)' },
    }),
  },
  connectButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  manualEntryCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      android: { elevation: 3 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  manualInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
    marginLeft: 10,
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a237e', marginBottom: 15 },
  gridWrapper: { marginBottom: 10 },
  weightButton: {
    width: '23%',
    paddingVertical: 12,
    backgroundColor: '#2196f3',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logCard: { padding: 10, borderRadius: 5, marginBottom: 20 },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logText: { fontSize: 16, fontWeight: 'bold' },
  logTime: { color: '#888' },
  logStatus: { fontWeight: 'bold' },
  instructionsBox: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 5,
    marginBottom: 40,
  },
  instructionsTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10 },
  instructionText: { fontSize: 15, color: '#333', marginBottom: 5 },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  scanningText: { textAlign: 'center', marginVertical: 20, color: '#666' },
});
