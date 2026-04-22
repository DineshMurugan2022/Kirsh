import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { LogEntry } from '@/hooks/use-bluetooth';

const modeColor: Record<string, string> = {
  selling: '#1a73e8',
  remaining: '#ff9800',
  oasys_scale: '#6a1b9a',
  Scale: '#6a1b9a',
  Error: '#f44336',
  System: '#78909c',
  POS: '#2e7d32',
};

const modeLabel: Record<string, string> = {
  selling: 'Selling',
  remaining: 'Remaining',
  oasys_scale: 'Scale',
  Scale: 'Scale',
  Error: 'Error',
  System: 'System',
  POS: 'POS',
};

type FilterMode = 'all' | 'selling' | 'remaining' | 'Scale' | 'Error';

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Scale', label: 'Scale' },
  { key: 'selling', label: 'Selling' },
  { key: 'remaining', label: 'Remaining' },
  { key: 'Error', label: 'Errors' },
];

function LogRow({ log }: { log: LogEntry }) {
  const color = modeColor[log.mode] ?? '#333';
  const label = modeLabel[log.mode] ?? log.mode;
  return (
    <View style={styles.row}>
      <View style={[styles.modeBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.modeText, { color }]}>{label}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowWeight}>{log.weight}</Text>
        <Text style={styles.rowTime}>{log.time}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: log.status === 'sent' ? '#4caf50' : '#f44336' }]} />
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');

  // Reload from AsyncStorage every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem('bt_activity_log')
        .then((raw) => {
          if (!active) return;
          if (raw) {
            try {
              setLogs(JSON.parse(raw) as LogEntry[]);
            } catch {
              setLogs([]);
            }
          } else {
            setLogs([]);
          }
        })
        .catch(() => active && setLogs([]))
        .finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [])
  );

  const filteredLogs = activeFilter === 'all'
    ? logs
    : logs.filter(l => l.mode === activeFilter || (activeFilter === 'Scale' && l.mode === 'oasys_scale'));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6ff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Weight History</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading…' : filteredLogs.length > 0
              ? `${filteredLogs.length} entr${filteredLogs.length !== 1 ? 'ies' : 'y'}`
              : 'No entries'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={async () => {
            await AsyncStorage.removeItem('bt_activity_log');
            setLogs([]);
          }}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, activeFilter === f.key && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterBtnText, activeFilter === f.key && styles.filterBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3f51b5" />
        </View>
      ) : filteredLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚖️</Text>
          <Text style={styles.emptyTitle}>
            {logs.length === 0 ? 'No weight entries yet' : 'No entries for this filter'}
          </Text>
          <Text style={styles.emptyHint}>
            {logs.length === 0
              ? 'Connect to a POS device and send a weight to see your history here.'
              : 'Try selecting a different filter above.'}
          </Text>
          {logs.length === 0 && (
            <TouchableOpacity style={styles.goHomeBtn} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.goHomeBtnText}>Go to Home</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filteredLogs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaf6',
    ...Platform.select({
      android: { elevation: 3 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      web: { boxShadow: '0px 2px 6px rgba(0,0,0,0.07)' } as any,
    }),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a237e',
  },
  headerSub: {
    fontSize: 13,
    color: '#7986cb',
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#ffebee',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e53935',
  },
  filterBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaf6',
    maxHeight: 52,
  },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterBtnActive: {
    backgroundColor: '#e8eaf6',
    borderColor: '#3f51b5',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  filterBtnTextActive: {
    color: '#3f51b5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 8,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      web: { boxShadow: '0px 1px 4px rgba(0,0,0,0.08)' } as any,
    }),
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rowInfo: {
    flex: 1,
  },
  rowWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a237e',
  },
  rowTime: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a237e',
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: 'center',
    color: '#7986cb',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  goHomeBtn: {
    backgroundColor: '#3f51b5',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  goHomeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
