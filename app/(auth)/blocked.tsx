import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { useAuth } from '@/src/auth/AuthProvider';

export default function BlockedScreen() {
  const router = useRouter();
  const { userDoc, status, signOut } = useAuth();
  
  React.useEffect(() => {
    if (status === 'ready') {
      router.replace('/(tabs)');
    }
  }, [status, router]);

  async function handleLogout() {
    await signOut();
    router.replace('/(auth)/login');
  }

  const message = userDoc?.isActive === false 
    ? "Account deactivated. Contact support."
    : "Subscription inactive. Contact admin.";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.subtitle}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>LOGOUT</Text>
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
  button: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
