// VERSION_V3_SIMPLE_UI
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { Header } from '@/components/home/Header';
import { StatusCard } from '@/components/home/StatusCard';
import { WeightButton } from '@/components/home/WeightButton';
import { ManualInput } from '@/components/home/ManualInput';
import { RecentActivity } from '@/components/home/RecentActivity';
import { Instructions } from '@/components/home/Instructions';
import { BluetoothModal } from '@/components/home/BluetoothModal';
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
    startDiscovery,
    connectToDevice,
    disconnectDevice,
    sendWeight: originalSendWeight,
    checkLastDevice,
  } = useBluetoothManager(lang);

  const t = translations[lang];

  useEffect(() => {
    void checkLastDevice();
  }, [checkLastDevice]);

  const promptConnectFirst = () => {
    Alert.alert('POS not connected', 'Please connect to the POS machine first.');
    if (!isScanning) {
      setModalVisible(true);
      startDiscovery();
    }
  };

  const handleSendWeight = (weight: string | number) => {
    if (connectionStatus !== 'connected') {
      promptConnectFirst();
      return;
    }
    void originalSendWeight(weight, user?.uid);
    if (typeof weight === 'string') setManualWeight('');
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.adminButton} 
              onPress={() => router.push('/(admin)')}
            >
              <Text style={styles.adminButtonText}>OPEN ADMIN DASHBOARD</Text>
            </TouchableOpacity>
          )}

          <Header 
            title={t.title} 
            lang={lang} 
            onToggleLang={() => setLang(lang === 'en' ? 'ta' : 'en')} 
          />

          <StatusCard 
            label={t.status} 
            status={t[connectionStatus as keyof typeof t]} 
            isConnected={connectionStatus === 'connected'} 
          />

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

          <ManualInput 
            placeholder={t.manualInput} 
            buttonText={t.send} 
            value={manualWeight} 
            onChangeText={setManualWeight} 
            onSend={() => handleSendWeight(manualWeight)} 
            disabled={isSending} 
          />

          <Text style={styles.sectionTitle}>{t.selectWeight}</Text>
          <View style={styles.gridWrapper}>
            <FlatList
              data={WEIGHTS}
              renderItem={({ item }) => (
                <WeightButton 
                  weight={item} 
                  onPress={() => handleSendWeight(item)} 
                  disabled={isSending} 
                />
              )}
              keyExtractor={(item) => item.toString()}
              numColumns={4}
              scrollEnabled={false}
              columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 10 }}
            />
          </View>

          <RecentActivity 
            title={t.log} 
            logs={activityLog} 
            translations={{ sent: t.sent, failed: t.failed }} 
          />

          <Instructions 
            title={t.instructions} 
            steps={[t.step1, t.step2, t.step3, t.step4]} 
          />
        </ScrollView>

        <BluetoothModal 
          visible={modalVisible} 
          onDismiss={() => setModalVisible(false)} 
          isScanning={isScanning} 
          devices={discoveredDevices} 
          onSelectDevice={(d) => {
            connectToDevice(d);
            setModalVisible(false);
          }} 
        />
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { padding: 20 },
  adminButton: {
    backgroundColor: '#ff9800',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    boxShadow: '0px 4px 12px rgba(255, 152, 0, 0.3)',
  },
  adminButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  connectButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    boxShadow: '0px 4px 12px rgba(76, 175, 80, 0.3)',
  },
  connectButtonText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a237e', marginBottom: 15 },
  gridWrapper: { marginBottom: 10 },
});
