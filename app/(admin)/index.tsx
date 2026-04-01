import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View, Platform } from 'react-native';
import { Card, Searchbar, Button, Surface } from 'react-native-paper';
import { firestore } from '@/src/firebase/config';
import { ADMIN_EMAIL } from '@/src/auth/AuthProvider';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = firestore.collection('users').onSnapshot((snap: any) => {
      const list = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
    });
    return unsub;
  }, []);

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      await firestore.collection('users').doc(userId).update({
        isActive: !currentStatus
      });
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const email = (u.email || '').toLowerCase();
    return email !== ADMIN_EMAIL && email.includes(searchQuery.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
      </Surface>
      
      <Searchbar
        placeholder="Search users..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.search}
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userEmail}>{item.email || 'No Email'}</Text>
                  <Text style={[styles.userStatus, { color: item.isActive ? '#4caf50' : '#f44336' }]}>
                    {item.isActive ? 'Active' : 'Inactive'} • {item.role || 'user'}
                  </Text>
                </View>
                
                <View style={styles.actions}>
                  <Button 
                    mode="contained" 
                    onPress={() => toggleUserActive(item.id, item.isActive)}
                    buttonColor={item.isActive ? '#f44336' : '#4caf50'}
                    style={styles.actionBtn}
                    labelStyle={{ fontSize: 12 }}
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { 
    padding: 20, 
    backgroundColor: '#1a237e', 
    ...Platform.select({ web: { paddingTop: 20 } }) 
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  search: { margin: 16, backgroundColor: '#fff', borderRadius: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { 
    marginBottom: 12, 
    backgroundColor: '#fff',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.1)' },
      android: { elevation: 3 }
    })
  },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userEmail: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userStatus: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  actions: { flexDirection: 'row' },
  actionBtn: { borderRadius: 4 },
});
