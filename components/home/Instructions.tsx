import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface InstructionsProps {
  title: string;
  steps: string[];
}

export const Instructions = ({ title, steps }: InstructionsProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {steps.map((step, index) => (
        <Text key={index} style={styles.text}>{step}</Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e8f5e9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
});
