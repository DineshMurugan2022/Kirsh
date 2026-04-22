import { Platform, StyleSheet, Text, View } from 'react-native';
import { Card } from 'react-native-paper';
import { LogEntry } from '@/hooks/use-bluetooth';

interface RecentActivityProps {
  title: string;
  logs: LogEntry[];
  translations: {
    sent: string;
    failed: string;
  };
}

export const RecentActivity = ({ title, logs, translations }: RecentActivityProps) => {
  if (logs.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.logCard}>
        {logs.map((log) => (
          <View key={log.id} style={styles.logItem}>
            <View style={styles.logMain}>
              <Text style={styles.logWeight}>{log.weight}</Text>
              <Text style={styles.logTime}>{log.time}</Text>
            </View>
            <Text style={[styles.logStatus, { color: log.status === 'sent' ? '#4caf50' : '#f44336' }]}>
              {log.status === 'sent' ? translations.sent : translations.failed}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 12,
  },
  logCard: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' } as any,
    }),
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logMain: {
    flex: 1,
  },
  logWeight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  logTime: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  logStatus: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
