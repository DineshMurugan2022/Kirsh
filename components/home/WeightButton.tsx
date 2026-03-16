import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface WeightButtonProps {
  weight: number;
  onPress: () => void;
  disabled: boolean;
}

export const WeightButton = ({ weight, onPress, disabled }: WeightButtonProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{weight}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '23%',
    paddingVertical: 14,
    backgroundColor: '#2196f3',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(33, 150, 243, 0.3)',
  },
  disabled: {
    backgroundColor: '#bbdefb',
    elevation: 0,
    boxShadow: 'none',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
