import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { firestore, serverTimestamp } from '@/src/firebase/config';
import { useAuth } from '@/src/auth/AuthProvider';

export default function OtpScreen() {
  const router = useRouter();
  const { user, userDoc, status, markOtpVerifiedLocally } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/(auth)/login');
    } else if (status === 'ready') {
      router.replace('/(tabs)');
    } else if (status === 'blocked') {
      router.replace('/(auth)/blocked');
    }
  }, [status, router]);

  const onVerify = async () => {
    if (!user || !userDoc) return;
    if (!code) {
      Alert.alert('OTP', 'Enter the OTP.');
      return;
    }
    setLoading(true);
    try {
      if (code.trim() !== (userDoc.otpCode || '').trim()) {
        throw new Error('Invalid OTP.');
      }
      await firestore.collection('users').doc(user.uid).update({
        lastOtpVerifiedAt: serverTimestamp(),
      });
      await markOtpVerifiedLocally();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('OTP failed', err?.message || 'Could not verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>OTP Verification</Text>
        <Text style={styles.subtitle}>Enter the OTP given by admin to use the app.</Text>
        <TextInput
          style={styles.input}
          placeholder="6-digit OTP"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          maxLength={6}
        />
        <TouchableOpacity style={styles.button} onPress={onVerify} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'VERIFY OTP'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 4,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
      web: { boxShadow: '0px 2px 2px rgba(0,0,0,0.2)' } as any,
    }),
  },
  button: {
    marginTop: 8,
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1a237e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
