import React from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ManualInputProps {
  placeholder: string;
  buttonText: string;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled: boolean;
  onClear?: () => void;
}

export const ManualInput = ({ 
  placeholder, 
  buttonText, 
  value, 
  onChangeText, 
  onSend, 
  disabled,
  onClear,
}: ManualInputProps) => {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder={placeholder}
        style={styles.input}
        keyboardType="decimal-pad"
        returnKeyType="send"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => { if (value && !disabled) onSend(); }}
        blurOnSubmit={false}
      />
      {!!value && !!onClear && (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <Text style={styles.clearBtnText}>✕</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        style={[styles.button, (disabled || !value) && styles.disabled]} 
        onPress={onSend}
        disabled={disabled || !value}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      android: { elevation: 3 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearBtnText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    elevation: 2,
  },
  disabled: {
    backgroundColor: '#9fa8da',
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
