import { Stack, useRouter } from 'expo-router';
import { getLocales } from 'expo-localization';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { Snackbar } from 'react-native-paper';
import { BluetoothModal } from '@/components/home/BluetoothModal';
import { Header } from '@/components/home/Header';
import { Instructions } from '@/components/home/Instructions';
import { ManualInput } from '@/components/home/ManualInput';
import { RecentActivity } from '@/components/home/RecentActivity';
import { StatusCard } from '@/components/home/StatusCard';
import { WeightButton } from '@/components/home/WeightButton';
import { useBluetoothManager } from '@/hooks/use-bluetooth';
import { useAuth } from '@/src/auth/AuthProvider';

const getInitialLang = (): 'en' | 'ta' => {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'ta' ? 'ta' : 'en';
  } catch {
    return 'en';
  }
};

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
    disconnect: 'DISCONNECT',
    protocolTitle: 'POS Mode',
    protocolHint: 'Use this switch to test OASYS mode and Billing mode in the same installed app.',
    oasysMode: 'OASYS SCALE',
    billingMode: 'BILLING POS',
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
    step1: '1. CONNECT \u0baa\u0bca\u0ba4\u0bcd\u0ba4\u0bbe\u0ba9\u0bc8 \u0b85\u0bb4\u0bc1\u0ba4\u0bcd\u0ba4\u0bb5\u0bc1\u0bae\u0bcd',
    step2: '2. Bluetooth \u0b85\u0ba9\u0bc1\u0bae\u0ba4\u0bbf\u0baf\u0bc8 \u0bb5\u0bb4\u0b99\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd',
    step3: '3. POS \u0b9a\u0bbe\u0ba4\u0ba9\u0ba4\u0bcd\u0ba4\u0bbf\u0bb2\u0bbf\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 \u0b87\u0ba3\u0bc8\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd',
    step4: '4. \u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bbf\u0baf \u0b8e\u0b9f\u0bc8\u0baf\u0bc8\u0ba4\u0bcd \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd',
    log: '\u0b9a\u0bae\u0bc0\u0baa\u0ba4\u0bcd\u0ba4\u0bbf\u0baf \u0b9a\u0bc6\u0baf\u0bb2\u0bcd\u0baa\u0bbe\u0b9f\u0bc1',
    sent: '\u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1',
    failed: '\u0ba4\u0bcb\u0bb2\u0bcd\u0bb5\u0bbf',
    disconnect: '\u0b87\u0ba3\u0bc8\u0baa\u0bcd\u0baa\u0bc8\u0ba4\u0bcd \u0ba4\u0bc1\u0ba3\u0bcd\u0b9f\u0bbf',
    protocolTitle: 'POS \u0bae\u0bc1\u0bb1\u0bc8',
    protocolHint: 'APK \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa\u0bbe\u0bae\u0bb2\u0bcd \u0b87\u0b99\u0bcd\u0b95\u0bc7\u0baf\u0bc7 OASYS \u0bae\u0bc1\u0bb1\u0bc8 \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd Billing \u0bae\u0bc1\u0bb1\u0bc8 \u0b9a\u0bcb\u0ba4\u0bbf\u0b95\u0bcd\u0b95\u0bb2\u0bbe\u0bae\u0bcd.',
    oasysMode: 'OASYS SCALE',
    billingMode: 'BILLING POS',
  },
};

export default function HomeScreen() {
  const [lang, setLang] = useState<'en' | 'ta'>(getInitialLang);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualWeight, setManualWeight] = useState('');
  const [lastSentWeight, setLastSentWeight] = useState<number | null>(null);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const lastSentResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastConnectPromptAt = useRef(0);
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
    weightProtocol,
    setWeightProtocol,
  } = useBluetoothManager(lang);

  const t = translations[lang];

  useEffect(() => {
    void checkLastDevice();
  }, [checkLastDevice]);

  useEffect(() => {
    return () => {
      if (lastSentResetTimer.current) clearTimeout(lastSentResetTimer.current);
    };
  }, []);

  const promptConnectFirst = () => {
    const now = Date.now();
    if (now - lastConnectPromptAt.current < 2500) return;
    lastConnectPromptAt.current = now;
    Alert.alert('POS not connected', 'Please connect to the POS machine first.');
    if (!isScanning) {
      setModalVisible(true);
      void startDiscovery();
    }
  };

  const handleSendWeight = async (weight: string | number) => {
    if (isSending) return;

    if (connectionStatus !== 'connected') {
      promptConnectFirst();
      return;
    }

    const result = await originalSendWeight(weight, user?.uid);
    if (!result.ok) {
      setSnackMsg(result.message || 'Weight not sent');
      setSnackVisible(true);
      return;
    }

    const numeric = typeof weight === 'number' ? weight : parseFloat(String(weight));
    if (!isNaN(numeric)) {
      setLastSentWeight(numeric);
      // Reset flash state after 800 ms so it can re-trigger on the next send
      if (lastSentResetTimer.current) clearTimeout(lastSentResetTimer.current);
      lastSentResetTimer.current = setTimeout(() => setLastSentWeight(null), 800);
    }
    // Show toast feedback
    const label = result.label || (isNaN(numeric) ? String(weight) : `${numeric} kg`);
    setSnackMsg(`Sent: ${label}`);
    setSnackVisible(true);
    // Do NOT clear manualWeight — user wants to send the same weight repeatedly
  };

  return (
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
            isConnecting={connectionStatus === 'connecting'}
          />

          <TouchableOpacity
            style={[styles.connectButton, connectionStatus === 'connected' && styles.disconnectButton]}
            disabled={isScanning}
            onPress={() => {
              if (connectionStatus === 'connected') {
                void disconnectDevice();
                return;
              }
              setModalVisible(true);
              void startDiscovery();
            }}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.connectButtonText}>
                {connectionStatus === 'connected' ? t.disconnect : t.connectBtn}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.protocolCard}>
            <Text style={styles.protocolTitle}>{t.protocolTitle}</Text>
            <Text style={styles.protocolHint}>{t.protocolHint}</Text>
            <View style={styles.protocolRow}>
              <TouchableOpacity
                style={[styles.protocolButton, weightProtocol === 'oasys_scale' && styles.protocolButtonActive]}
                onPress={() => setWeightProtocol('oasys_scale')}
              >
                <Text style={[styles.protocolButtonText, weightProtocol === 'oasys_scale' && styles.protocolButtonTextActive]}>
                  {t.oasysMode}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.protocolButton, weightProtocol === 'sr_prefix' && styles.protocolButtonActive]}
                onPress={() => setWeightProtocol('sr_prefix')}
              >
                <Text style={[styles.protocolButtonText, weightProtocol === 'sr_prefix' && styles.protocolButtonTextActive]}>
                  {t.billingMode}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ManualInput
            placeholder={t.manualInput}
            buttonText={t.send}
            value={manualWeight}
            onChangeText={setManualWeight}
            onSend={() => handleSendWeight(manualWeight)}
            onClear={() => setManualWeight('')}
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
                  lastSentWeight={lastSentWeight}
                />
              )}
              keyExtractor={(item) => item.toString()}
              numColumns={4}
              scrollEnabled={false}
              columnWrapperStyle={styles.gridRow}
            />
          </View>

          <RecentActivity title={t.log} logs={activityLog} translations={{ sent: t.sent, failed: t.failed }} />

          {connectionStatus !== 'connected' && (
            <Instructions title={t.instructions} steps={[t.step1, t.step2, t.step3, t.step4]} />
          )}
        </ScrollView>

        <BluetoothModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          isScanning={isScanning}
          devices={discoveredDevices}
          onSelectDevice={(device) => {
            void (async () => {
              const connected = await connectToDevice(device);
              if (connected) setModalVisible(false);
            })();
          }}
          onRetry={() => {
            void startDiscovery();
          }}
        />

        <Snackbar
          visible={snackVisible}
          onDismiss={() => setSnackVisible(false)}
          duration={1800}
          style={styles.snackbar}
          wrapperStyle={styles.snackbarWrapper}
        >
          {snackMsg}
        </Snackbar>
      </SafeAreaView>
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
    ...Platform.select({
      android: { elevation: 4 },
      ios: { shadowColor: '#ff9800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
      web: { boxShadow: '0px 4px 12px rgba(255,152,0,0.3)' } as any,
    }),
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
    marginBottom: 16,
    minHeight: 54,
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 4 },
      ios: { shadowColor: '#4caf50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
      web: { boxShadow: '0px 4px 12px rgba(76,175,80,0.3)' } as any,
    }),
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
  protocolCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  protocolTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 6,
  },
  protocolHint: {
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  protocolRow: {
    flexDirection: 'row',
    gap: 10,
  },
  protocolButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#90caf9',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#eef6ff',
    alignItems: 'center',
  },
  protocolButtonActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  protocolButtonText: {
    color: '#1a73e8',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  protocolButtonTextActive: {
    color: '#fff',
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
  snackbar: {
    backgroundColor: '#1a237e',
    borderRadius: 10,
  },
  snackbarWrapper: {
    bottom: 20,
    paddingHorizontal: 16,
  },
});
