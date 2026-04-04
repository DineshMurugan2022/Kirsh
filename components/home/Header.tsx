import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
  title: string;
  lang: 'en' | 'ta';
  onToggleLang: () => void;
}

export const Header = ({ title, lang, onToggleLang }: HeaderProps) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.langBubble} onPress={onToggleLang}>
        <Text style={styles.langText}>{lang === 'en' ? '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd' : 'English'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a237e',
    letterSpacing: 0.5,
  },
  langBubble: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#3f51b5',
    elevation: 3,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
  },
  langText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
