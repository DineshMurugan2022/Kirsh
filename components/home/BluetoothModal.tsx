import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Divider, List, Modal, Portal } from 'react-native-paper';

interface BluetoothModalProps {
  visible: boolean;
  onDismiss: () => void;
  isScanning: boolean;
  devices: any[];
  onSelectDevice: (device: any) => void;
}

export const BluetoothModal = ({
  visible,
  onDismiss,
  isScanning,
  devices,
  onSelectDevice,
}: BluetoothModalProps) => {
  const getDeviceTitle = (device: any) => {
    const rawName =
      typeof device?.name === 'string'
        ? device.name.trim()
        : typeof device?.deviceName === 'string'
          ? device.deviceName.trim()
          : '';

    if (rawName) return rawName;

    const address = String(device?.address ?? '').trim();
    const shortAddress = address ? address.slice(-5).replace(':', '') : '';
    return shortAddress ? `POS Device ${shortAddress}` : 'Unknown POS';
  };

  const getDeviceDescription = (device: any) => {
    const parts = [device?.address, device?.bonded ? 'Paired' : null].filter(Boolean);
    return parts.join(' • ');
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalTitle}>Select POS Device</Text>
        <Text style={styles.helperText}>
          Pick your billing terminal from the list. The app will try a direct Bluetooth connection first.
        </Text>
        <Divider />
        {isScanning && (
          <Text style={styles.scanningText}>
            Searching nearby devices...
          </Text>
        )}
        {devices.length === 0 ? (
          <Text style={styles.scanningText}>
            No POS devices found nearby. Keep the POS Bluetooth screen open and scan again.
          </Text>
        ) : (
          <ScrollView style={styles.deviceList}>
            {devices.map((device, index) => (
              <List.Item
                key={index}
                title={getDeviceTitle(device)}
                description={getDeviceDescription(device)}
                onPress={() => onSelectDevice(device)}
                left={(props) => <List.Icon {...props} icon="bluetooth" color="#3f51b5" />}
              />
            ))}
          </ScrollView>
        )}
        <Button mode="text" onPress={onDismiss} style={styles.cancelBtn} labelStyle={styles.cancelLabel}>
          Cancel
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  helperText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  scanningText: {
    textAlign: 'center',
    marginVertical: 30,
    color: '#666',
    fontSize: 16,
    lineHeight: 22,
  },
  deviceList: {
    maxHeight: 300,
    marginVertical: 10,
  },
  cancelBtn: {
    marginTop: 10,
  },
  cancelLabel: {
    color: '#f44336',
  },
});
