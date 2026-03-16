import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface StatusCardProps {
  label: string;
  status: string;
  isConnected: boolean;
}

export const StatusCard = ({ label, status, isConnected }: StatusCardProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        {label}:{' '}
        <Text style={[styles.statusText, { color: isConnected ? '#4caf50' : '#f44336' }]}>
          {status}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' },
    }),
  },
  label: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  statusText: {
    fontWeight: 'bold',
  },
});
