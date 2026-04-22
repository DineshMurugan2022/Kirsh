import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface StatusCardProps {
  label: string;
  status: string;
  isConnected: boolean;
  isConnecting?: boolean;
}

export const StatusCard = ({ label, status, isConnected, isConnecting }: StatusCardProps) => {
  const dotColor = isConnected ? '#4caf50' : isConnecting ? '#ff9800' : '#f44336';
  const statusColor = isConnected ? '#4caf50' : isConnecting ? '#ff9800' : '#f44336';

  return (
    <View style={[styles.card, isConnected && styles.cardConnected]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: dotColor }, isConnected && styles.dotPulse]} />
        <Text style={styles.label}>
          {label}:{' '}
          <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' } as any,
    }),
  },
  cardConnected: {
    borderLeftColor: '#4caf50',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  dotPulse: {
    // The green dot gives a "live" feel
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  label: {
    fontSize: 18,
    color: '#666',
  },
  statusText: {
    fontWeight: 'bold',
  },
});
