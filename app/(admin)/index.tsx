import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Button, Surface } from 'react-native-paper';
import { firestore } from '@/src/firebase/config';
import { ADMIN_EMAIL } from '@/src/auth/AuthProvider';

interface UserRecord {
  id: string;
  email?: string;
  isActive?: boolean;
  role?: string;
  otpCode?: string;
  subscriptionExpiresAt?: any;
  phone?: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal state
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [editOtp, setEditOtp] = useState('');
  const [editExpiry, setEditExpiry] = useState(''); // YYYY-MM-DD format
  const [editSaving, setEditSaving] = useState(false);

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
        isActive: !currentStatus,
      });
    } catch (err) {
      console.error('Failed to update user status:', err);
      Alert.alert('Error', 'Failed to update user status.');
    }
  };

  const openEdit = (user: UserRecord) => {
    setEditing(user);
    setEditOtp(user.otpCode ?? '');
    // Convert Firestore Timestamp → date string
    let expStr = '';
    if (user.subscriptionExpiresAt) {
      try {
        const d: Date =
          typeof user.subscriptionExpiresAt.toDate === 'function'
            ? user.subscriptionExpiresAt.toDate()
            : new Date(user.subscriptionExpiresAt);
        expStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      } catch {
        expStr = '';
      }
    }
    setEditExpiry(expStr);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      const updates: Record<string, any> = {};

      // OTP
      updates.otpCode = editOtp.trim() || null;

      // Subscription expiry
      if (editExpiry.trim()) {
        const parsed = new Date(editExpiry.trim());
        if (isNaN(parsed.getTime())) {
          Alert.alert('Invalid date', 'Enter expiry as YYYY-MM-DD (e.g. 2025-12-31).');
          setEditSaving(false);
          return;
        }
        updates.subscriptionExpiresAt = parsed;
      } else {
        updates.subscriptionExpiresAt = null;
      }

      await firestore.collection('users').doc(editing.id).update(updates);
      setEditing(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const email = (u.email || '').toLowerCase();
    return email !== ADMIN_EMAIL && email.includes(searchQuery.toLowerCase());
  });

  const formatExpiry = (val: any): string => {
    if (!val) return '—';
    try {
      const d: Date =
        typeof val.toDate === 'function' ? val.toDate() : new Date(val);
      return d.toLocaleDateString();
    } catch {
      return '—';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSub}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</Text>
      </Surface>

      <TextInput
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.search}
        placeholderTextColor="#999"
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const expiry = formatExpiry(item.subscriptionExpiresAt);
          const isExpired = (() => {
            if (!item.subscriptionExpiresAt) return false;
            try {
              const d = typeof item.subscriptionExpiresAt.toDate === 'function'
                ? item.subscriptionExpiresAt.toDate()
                : new Date(item.subscriptionExpiresAt);
              return d < new Date();
            } catch { return false; }
          })();

          return (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userEmail}>{item.email || 'No Email'}</Text>
                    <Text style={[styles.userStatus, { color: item.isActive ? '#4caf50' : '#f44336' }]}>
                      {item.isActive ? 'Active' : 'Inactive'} • {item.role || 'user'}
                    </Text>
                    {item.otpCode ? (
                      <Text style={styles.metaText}>OTP: {item.otpCode}</Text>
                    ) : null}
                    <Text style={[styles.metaText, isExpired && styles.expiredText]}>
                      Expires: {expiry}{isExpired ? ' ⚠ Expired' : ''}
                    </Text>
                  </View>

                  <View style={styles.actions}>
                    <Button
                      mode="contained"
                      onPress={() => toggleUserActive(item.id, !!item.isActive)}
                      buttonColor={item.isActive ? '#f44336' : '#4caf50'}
                      style={styles.actionBtn}
                      labelStyle={{ fontSize: 11 }}
                      compact
                    >
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                      <Text style={styles.editBtnText}>✎ Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        }}
        contentContainerStyle={styles.list}
      />

      {/* Edit Modal */}
      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User</Text>
            <Text style={styles.modalEmail}>{editing?.email}</Text>

            <Text style={styles.fieldLabel}>OTP Code (leave blank to remove)</Text>
            <TextInput
              style={styles.fieldInput}
              value={editOtp}
              onChangeText={setEditOtp}
              placeholder="e.g. 123456"
              keyboardType="number-pad"
              maxLength={8}
            />

            <Text style={styles.fieldLabel}>Subscription Expiry (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.fieldInput}
              value={editExpiry}
              onChangeText={setEditExpiry}
              placeholder="e.g. 2025-12-31"
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditing(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, editSaving && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={editSaving}
              >
                <Text style={styles.saveBtnText}>{editSaving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    padding: 20,
    backgroundColor: '#1a237e',
    ...Platform.select({ web: { paddingTop: 20 } }),
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#9fa8da', fontSize: 13, marginTop: 2 },
  search: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      web: { boxShadow: '0px 1px 4px rgba(0,0,0,0.08)' } as any,
    }),
  },
  list: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8 },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.1)' } as any,
      android: { elevation: 3 },
    }),
  },
  userRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  userEmail: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  userStatus: { fontSize: 12, marginTop: 3, fontWeight: '600' },
  metaText: { fontSize: 11, color: '#888', marginTop: 2 },
  expiredText: { color: '#e53935', fontWeight: '700' },
  actions: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  actionBtn: { borderRadius: 4 },
  editBtn: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editBtnText: { color: '#3f51b5', fontWeight: '700', fontSize: 12 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a237e', marginBottom: 2 },
  modalEmail: { fontSize: 13, color: '#888', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
    marginBottom: 8,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#f5f5f5' },
  cancelBtnText: { color: '#666', fontWeight: '700', fontSize: 15 },
  saveBtn: { backgroundColor: '#1a237e' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
