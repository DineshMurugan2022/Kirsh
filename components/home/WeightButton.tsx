import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface WeightButtonProps {
  weight: number;
  onPress: () => void;
  disabled: boolean;
  lastSentWeight?: number | null;
}

export const WeightButton = ({ weight, onPress, disabled, lastSentWeight }: WeightButtonProps) => {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevLastSent = useRef<number | null | undefined>(null);

  useEffect(() => {
    if (lastSentWeight === weight && lastSentWeight !== prevLastSent.current) {
      prevLastSent.current = lastSentWeight;
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 120, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    }
  }, [lastSentWeight, weight, flashAnim]);

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2196f3', '#4caf50'],
  });

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.button, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.flashOverlay, { backgroundColor: bgColor }]} />
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
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#2196f3', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
      web: { boxShadow: '0px 2px 4px rgba(33, 150, 243, 0.3)' } as any,
    }),
  },
  flashOverlay: {
    borderRadius: 8,
  },
  disabled: {
    backgroundColor: '#bbdefb',
    ...Platform.select({
      android: { elevation: 0 },
      ios: { shadowOpacity: 0 },
      web: { boxShadow: 'none' } as any,
    }),
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
