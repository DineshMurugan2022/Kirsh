import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Divider, TextInput, Switch } from 'react-native-paper';
import { firestore, firebase } from '@/src/firebase/config';

export default function UserManagement() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = firestore.collection('users').doc(id as string).onSnapshot((doc: any) => {
      setUser({ id: doc.id, ...doc.data() });
    });
    return unsub;
  }, [id]);

  const toggleActive = async () => {
    if (!user) return;
    await firestore.collection('users').doc(user.id).update({
      isActive: !user.isActive
    });
  };

  const generateOtp = async () => {
    if (!user) return;
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await firestore.collection('users').doc(user.id).update({
        otpCode: code,
        lastOtpVerifiedAt: null // Force re-verification
      });
      Alert.alert('OTP Generated', `New OTP for ${user.email || user.phoneNumber}: ${code}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const extendSubscription = async () => {
    if (!user) return;
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    await firestore.collection('users').doc(user.id).update({
      subscriptionExpiresAt: firebase.firestore.Timestamp.fromDate(nextMonth),
      isActive: true
    });
    Alert.alert('Success', 'Subscription extended by 30 days');
  };

  if (!user) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="User Details" subtitle={user.id} />
        <Card.Content>
          <Text style={styles.label}>Email: {user.email || 'N/A'}</Text>
          <Text style={styles.label}>Phone: {user.phoneNumber || 'N/A'}</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.row}>
            <Text>Account Active</Text>
            <Switch value={user.isActive} onValueChange={toggleActive} />
          </View>
          
          <Text style={styles.label}>
            Expiry: {user.subscriptionExpiresAt?.toDate().toLocaleDateString() || 'No subscription'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Actions" />
        <Card.Content>
          <Button mode="contained" onPress={generateOtp} loading={loading} style={styles.btn}>
            GENERATE NEW OTP
          </Button>
          <Button mode="outlined" onPress={extendSubscription} style={styles.btn}>
            EXTEND SUBSCRIPTION (30 DAYS)
          </Button>
        </Card.Content>
      </Card>
      
      {user.otpCode && (
        <Card style={[styles.card, { backgroundColor: '#e8f5e9' }]}>
          <Card.Content>
            <Text style={styles.otpLabel}>Current Active OTP:</Text>
            <Text style={styles.otpValue}>{user.otpCode}</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 16 },
  card: { marginBottom: 16, boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, marginVertical: 4 },
  divider: { marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  btn: { marginVertical: 8 },
  otpLabel: { fontSize: 14, color: '#2e7d32', fontWeight: 'bold' },
  otpValue: { fontSize: 32, textAlign: 'center', fontWeight: 'bold', color: '#1b5e20', letterSpacing: 4, marginVertical: 10 }
});
