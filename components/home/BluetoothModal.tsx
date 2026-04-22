import React from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Divider, List, Modal, Portal } from 'react-native-paper';

interface BluetoothModalProps {
  visible: boolean;
  onDismiss: () => void;
  isScanning: boolean;
  devices: any[];
  onSelectDevice: (device: any) => void;
  onRetry?: () => void;
}

export const BluetoothModal = ({
  visible,
  onDismiss,
  isScanning,
  devices,
  onSelectDevice,
  onRetry,
}: BluetoothModalProps) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.btIconWrap}>
            <Text style={styles.btIcon}>⬡</Text>
          </View>
          <Text style={styles.modalTitle}>Select POS Device</Text>
          <Text style={styles.modalSubtitle}>
            {isScanning ? 'Searching nearby…' : `${devices.length} device${devices.length !== 1 ? 's' : ''} found`}
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* Body */}
        {isScanning ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color="#3f51b5" />
            <Text style={styles.scanningText}>Scanning for Bluetooth devices…</Text>
          </View>
        ) : devices.length === 0 ? (
          <View style={styles.centeredState}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.scanningText}>No POS devices found nearby.</Text>
            <Text style={styles.scanningHint}>
              Make sure the POS is powered on and within range.
            </Text>
            {onRetry && (
              <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>Retry Scan</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
            {devices.map((d, index) => (
              <TouchableOpacity
                key={d.address || index}
                style={styles.deviceItem}
                onPress={() => onSelectDevice(d)}
                activeOpacity={0.7}
              >
                {/* BT icon */}
                <View style={[styles.deviceIcon, d.bonded && styles.deviceIconBonded]}>
                  <Text style={styles.deviceIconText}>🔵</Text>
                </View>

                {/* Device info */}
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{d.name || d.deviceName || 'Unknown POS'}</Text>
                  <Text style={styles.deviceAddress}>{d.address}</Text>
                </View>

                {/* Bonded badge */}
                {d.bonded && (
                  <View style={styles.bondedBadge}>
                    <Text style={styles.bondedText}>Paired</Text>
                  </View>
                )}

                {/* Arrow */}
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Divider style={styles.divider} />

        {/* Footer buttons */}
        <View style={styles.footer}>
          {!isScanning && onRetry && devices.length > 0 && (
            <TouchableOpacity style={styles.footerRetryBtn} onPress={onRetry}>
              <Text style={styles.footerRetryText}>🔄  Refresh</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelButton} onPress={onDismiss}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 12 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
      web: { boxShadow: '0px 8px 24px rgba(0,0,0,0.15)' } as any,
    }),
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f4f6ff',
  },
  btIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3f51b5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  btIcon: {
    color: '#fff',
    fontSize: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a237e',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#7986cb',
  },
  divider: {
    backgroundColor: '#e8eaf6',
    height: 1,
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  scanningText: {
    textAlign: 'center',
    marginTop: 14,
    color: '#444',
    fontSize: 15,
    fontWeight: '600',
  },
  scanningHint: {
    textAlign: 'center',
    marginTop: 6,
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3f51b5',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  deviceList: {
    maxHeight: 320,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e8eaf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconBonded: {
    backgroundColor: '#e8f5e9',
  },
  deviceIconText: {
    fontSize: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a237e',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  bondedBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  bondedText: {
    color: '#2e7d32',
    fontSize: 11,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 22,
    color: '#bbb',
    fontWeight: '300',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  footerRetryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c5cae9',
    backgroundColor: '#f4f6ff',
  },
  footerRetryText: {
    color: '#3f51b5',
    fontWeight: '600',
    fontSize: 13,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  cancelText: {
    color: '#e53935',
    fontWeight: '700',
    fontSize: 14,
  },
});
