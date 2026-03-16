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
  onSelectDevice 
}: BluetoothModalProps) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContent}
      >
        <Text style={styles.modalTitle}>Select POS Device</Text>
        <Divider />
        {isScanning ? (
          <Text style={styles.scanningText}>Searching for devices...</Text>
        ) : devices.length === 0 ? (
          <Text style={styles.scanningText}>No POS devices found nearby.</Text>
        ) : (
          <ScrollView style={styles.deviceList}>
            {devices.map((d, index) => (
              <List.Item
                key={index}
                title={d.name || 'Unknown POS'}
                description={d.address}
                onPress={() => onSelectDevice(d)}
                left={(props) => <List.Icon {...props} icon="bluetooth" color="#3f51b5" />}
              />
            ))}
          </ScrollView>
        )}
        <Button 
          mode="text" 
          onPress={onDismiss} 
          style={styles.cancelBtn}
          labelStyle={{ color: '#f44336' }}
        >
          Cancel
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  scanningText: {
    textAlign: 'center',
    marginVertical: 30,
    color: '#666',
    fontSize: 16,
  },
  deviceList: {
    maxHeight: 300,
    marginVertical: 10,
  },
  cancelBtn: {
    marginTop: 10,
  },
});
