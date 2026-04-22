import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { auth } from '@/src/firebase/config';
import { useAuth } from '@/src/auth/AuthProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (status === 'ready') {
      router.replace('/(tabs)');
    } else if (status === 'needsOtp') {
      router.replace('/(auth)/otp');
    } else if (status === 'blocked') {
      router.replace('/(auth)/blocked');
    }
  }, [status, router]);

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('Login', 'Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email.trim(), password);
    } catch (err: any) {
      console.error('Login Error Object:', err);
      Alert.alert('Login failed', err?.message || 'Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = () => {
    Alert.prompt(
      'Reset Password',
      'Enter your email address to receive a password reset link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (inputEmail?: string) => {
            const target = (inputEmail ?? email).trim();
            if (!target) {
              Alert.alert('Reset Password', 'Please enter your email address.');
              return;
            }
            try {
              await (auth as any).sendPasswordResetEmail(target);
              Alert.alert('Email sent', `Password reset link sent to ${target}.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to send reset email.');
            }
          },
        },
      ],
      'plain-text',
      email
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>BMI APP</Text>
        <Text style={styles.subtitle}>Login to continue</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          returnKeyType="done"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onLogin}
        />
        <TouchableOpacity style={styles.button} onPress={onLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'LOGIN'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onForgotPassword} style={styles.forgotLink}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={{ marginTop: 12 }}>
          <Text style={{ color: '#4caf50', fontWeight: 'bold' }}>{"Don't have an account? Sign Up"}</Text>
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
  },
  button: {
    marginTop: 8,
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forgotLink: {
    marginTop: 14,
  },
  forgotText: {
    color: '#1a237e',
    fontSize: 14,
    fontWeight: '500',
  },
});
