import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { BluetoothModal } from '@/components/home/BluetoothModal';
import { Header } from '@/components/home/Header';
import { Instructions } from '@/components/home/Instructions';
import { ManualInput } from '@/components/home/ManualInput';
import { RecentActivity } from '@/components/home/RecentActivity';
import { StatusCard } from '@/components/home/StatusCard';
import { WeightButton } from '@/components/home/WeightButton';
import { useBluetoothManager } from '@/hooks/use-bluetooth';
import { useAuth } from '@/src/auth/AuthProvider';

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
    step1: '1. Tap CONNECT.',
    step2: '2. Allow Bluetooth discovery.',
    step3: '3. Select your POS device from the list.',
    step4: '4. Send the required weight.',
    log: 'Recent Activity',
    sent: 'Sent',
    failed: 'Failed',
    disconnect: 'DISCONNECT',
  },
  ta: {
    title: 'BMI \u0b9a\u0bc6\u0baf\u0bb2\u0bbf',
    status: '\u0ba8\u0bbf\u0bb2\u0bc8',
    notConnected: '\u0b87\u0ba3\u0bc8\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8',
    connecting: '\u0b87\u0ba3\u0bc8\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0b95\u0bbf\u0bb1\u0ba4\u0bc1...',
    connected: '\u0b87\u0ba3\u0bc8\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1',
    connectBtn: 'POS-\u0b89\u0b9f\u0ba9\u0bcd \u0b87\u0ba3\u0bc8\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd',
    selectWeight: '\u0b8e\u0b9f\u0bc8\u0baf\u0bc8\u0ba4\u0bcd \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd (\u0b95\u0bbf.\u0b95\u0bbf):',
    manualInput: '\u0b95\u0bc8\u0bae\u0bc1\u0bb1\u0bc8\u0baf\u0bbe\u0b95 \u0b89\u0bb3\u0bcd\u0bb3\u0bbf\u0b9f\u0bb5\u0bc1\u0bae\u0bcd',
    send: '\u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa\u0bc1\u0b95',
    instructions: '\u0bb5\u0bb4\u0bbf\u0bae\u0bc1\u0bb1\u0bc8\u0b95\u0bb3\u0bcd:',
    step1: '1. CONNECT \u0baa\u0bca\u0ba4\u0bcd\u0ba4\u0bbe\u0ba9\u0bc8 \u0b85\u0bb4\u0bc1\u0ba4\u0bcd\u0ba4\u0bb5\u0bc1\u0bae\u0bcd.',
    step2: '2. Bluetooth \u0b85\u0ba9\u0bc1\u0bae\u0ba4\u0bbf\u0baf\u0bc8 \u0bb5\u0bb4\u0b99\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd.',
    step3: '3. \u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bbf\u0bb2\u0bbf\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd POS \u0b9a\u0bbe\u0ba4\u0ba9\u0ba4\u0bcd\u0ba4\u0bc8 \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd.',
    step4: '4. \u0ba4\u0bc7\u0bb5\u0bc8\u0baf\u0bbe\u0ba9 \u0b8e\u0b9f\u0bc8\u0baf\u0bc8 \u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa\u0bb5\u0bc1\u0bae\u0bcd.',
    log: '\u0b9a\u0bae\u0bc0\u0baa\u0ba4\u0bcd\u0ba4\u0bbf\u0baf \u0b9a\u0bc6\u0baf\u0bb2\u0bcd\u0baa\u0bbe\u0b9f\u0bc1',
    sent: '\u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1',
    failed: '\u0ba4\u0bcb\u0bb2\u0bcd\u0bb5\u0bbf',
    disconnect: '\u0b87\u0ba3\u0bc8\u0baa\u0bcd\u0baa\u0bc8\u0ba4\u0bcd \u0ba4\u0bc1\u0ba3\u0bcd\u0b9f\u0bbf',
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
      void startDiscovery();
    }
  };

  const handleSendWeight = (weight: string | number) => {
    if (connectionStatus !== 'connected') {
      promptConnectFirst();
      return;
    }

    void originalSendWeight(weight, user?.uid);
    if (typeof weight === 'string') {
      setManualWeight('');
    }
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isAdmin && (
            <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/(admin)')}>
              <Text style={styles.adminButtonText}>OPEN ADMIN DASHBOARD</Text>
            </TouchableOpacity>
          )}

          <Header title={t.title} lang={lang} onToggleLang={() => setLang(lang === 'en' ? 'ta' : 'en')} />

          <StatusCard
            label={t.status}
            status={t[connectionStatus as keyof typeof t]}
            isConnected={connectionStatus === 'connected'}
          />

          <TouchableOpacity
            style={[styles.connectButton, connectionStatus === 'connected' && styles.disconnectButton]}
            onPress={() => {
              if (connectionStatus === 'connected') {
                void disconnectDevice();
                return;
              }

              setModalVisible(true);
              void startDiscovery();
            }}
          >
            <Text style={styles.connectButtonText}>
              {connectionStatus === 'connected' ? t.disconnect : isScanning ? t.connecting : t.connectBtn}
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
                <WeightButton weight={item} onPress={() => handleSendWeight(item)} disabled={isSending} />
              )}
              keyExtractor={(item) => item.toString()}
              numColumns={4}
              scrollEnabled={false}
              columnWrapperStyle={styles.gridRow}
            />
          </View>

          <RecentActivity title={t.log} logs={activityLog} translations={{ sent: t.sent, failed: t.failed }} />

          <Instructions title={t.instructions} steps={[t.step1, t.step2, t.step3, t.step4]} />
        </ScrollView>

        <BluetoothModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          isScanning={isScanning}
          devices={discoveredDevices}
          onSelectDevice={async (device) => {
            const connected = await connectToDevice(device);
            if (connected) {
              setModalVisible(false);
            }
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
  disconnectButton: {
    backgroundColor: '#f44336',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 15,
  },
  gridWrapper: {
    marginBottom: 10,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
