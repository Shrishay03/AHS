import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const T = { primary: '#2E7D32', secondary: '#1976D2', bg: '#F5F5F5', card: '#FFF', text: '#212121', muted: '#757575', ok: '#4CAF50', warn: '#FF9800', err: '#F44336' };
const CATEGORIES = ['Bags', 'Labor', 'Transport', 'Materials', 'Rent', 'Electricity', 'Food', 'Misc'];

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10), amount: '', type: 'Expense', mode: 'Bank',
    linked_project_id: '', linked_project_name: '', category: 'Bags', description: '',
  });

  const fetchData = async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/transactions`),
        fetch(`${BACKEND_URL}/api/projects`),
      ]);
      setTransactions(await tRes.json());
      setProjects(await pRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const fmt = (n: number) => `\u20b9${(n || 0).toLocaleString('en-IN')}`;

  const openAdd = () => {
    setEditingTxn(null);
    setFormData({ date: new Date().toISOString().slice(0, 10), amount: '', type: 'Expense', mode: 'Bank', linked_project_id: '', linked_project_name: '', category: 'Bags', description: '' });
    setModalVisible(true);
  };

  const openEdit = (t: any) => {
    setEditingTxn(t);
    const dateStr = typeof t.date === 'string' ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10);
    setFormData({
      date: dateStr, amount: t.amount.toString(), type: t.type, mode: t.mode,
      linked_project_id: t.linked_project_id || '', linked_project_name: t.linked_project_name || '',
      category: t.category || 'Bags', description: t.description || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.amount) { Alert.alert('Error', 'Enter amount'); return; }
    try {
      const payload = {
        date: formData.date, amount: parseFloat(formData.amount), type: formData.type,
        mode: formData.mode, linked_project_id: formData.linked_project_id || null,
        linked_project_name: formData.linked_project_name || null,
        category: formData.type === 'Expense' ? formData.category : null,
        description: formData.description,
      };
      const url = editingTxn ? `${BACKEND_URL}/api/transactions/${editingTxn.id}` : `${BACKEND_URL}/api/transactions`;
      const r = await fetch(url, { method: editingTxn ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) { setModalVisible(false); fetchData(); }
    } catch (e) { Alert.alert('Error', 'Failed to save'); }
  };

  const handleDelete = (t: any) => {
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await fetch(`${BACKEND_URL}/api/transactions/${t.id}`, { method: 'DELETE' });
        fetchData();
      }},
    ]);
  };

  const handleExport = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/export/transactions?format=csv`);
      Alert.alert('Export', 'Transactions exported successfully as CSV');
    } catch (e) { Alert.alert('Error', 'Export failed'); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={T.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={{ backgroundColor: T.card, padding: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
        <TouchableOpacity testID="export-csv-btn" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#E8F5E9', gap: 6 }}
          onPress={handleExport}>
          <Ionicons name="download-outline" size={18} color={T.primary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.primary }}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[T.primary]} />}>
        {transactions.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <Ionicons name="receipt-outline" size={64} color={T.muted} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: T.text, marginTop: 16 }}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((t) => (
            <View key={t.id} style={s.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                  <View style={[s.typeIcon, { backgroundColor: t.type === 'Income' ? T.ok : T.err }]}>
                    <Ionicons name={t.type === 'Income' ? 'arrow-down' : 'arrow-up'} size={18} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>
                      {typeof t.date === 'string' ? t.date.slice(0, 10) : ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: T.muted }}>{t.mode}{t.category ? ` | ${t.category}` : ''}</Text>
                    {t.linked_project_name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="folder-outline" size={12} color={T.secondary} />
                        <Text style={{ fontSize: 11, color: T.secondary }}>{t.linked_project_name}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: t.type === 'Income' ? T.ok : T.err }}>
                  {t.type === 'Income' ? '+' : '-'}{fmt(t.amount)}
                </Text>
              </View>
              {t.description ? <Text style={{ fontSize: 12, color: T.muted, fontStyle: 'italic', marginTop: 4 }}>{t.description}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => openEdit(t)}>
                  <Ionicons name="create-outline" size={16} color={T.secondary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: T.secondary }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDelete(t)}>
                  <Ionicons name="trash-outline" size={16} color={T.err} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: T.err }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity testID="add-transaction-fab" style={s.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: T.text }}>{editingTxn ? 'Edit Transaction' : 'Add Transaction'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color={T.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <Label text="Type" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['Income', 'Expense'].map(tp => (
                  <TouchableOpacity key={tp} style={[s.chipBtn, formData.type === tp && { backgroundColor: tp === 'Income' ? T.ok : T.err, borderColor: tp === 'Income' ? T.ok : T.err }]}
                    onPress={() => setFormData({ ...formData, type: tp })}>
                    <Text style={[{ fontSize: 13, fontWeight: '600', color: T.muted }, formData.type === tp && { color: '#FFF' }]}>{tp}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Label text="Amount *" />
              <TextInput style={s.input} value={formData.amount} onChangeText={v => setFormData({ ...formData, amount: v })} keyboardType="numeric" placeholder="0" />

              <Label text="Date" />
              <TextInput style={s.input} value={formData.date} onChangeText={v => setFormData({ ...formData, date: v })} placeholder="YYYY-MM-DD" />

              <Label text="Mode" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Bank', 'Petty Cash', 'Partner'].map(m => (
                  <TouchableOpacity key={m} style={[s.chipBtn, formData.mode === m && { backgroundColor: T.secondary, borderColor: T.secondary }]}
                    onPress={() => setFormData({ ...formData, mode: m })}>
                    <Text style={[{ fontSize: 12, fontWeight: '600', color: T.muted }, formData.mode === m && { color: '#FFF' }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Project Linking */}
              <Label text="Link to Project (optional)" />
              <TouchableOpacity testID="select-project-btn" style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => setProjectPickerVisible(true)}>
                <Text style={{ color: formData.linked_project_name ? T.text : T.muted, fontSize: 14 }}>
                  {formData.linked_project_name || 'Select project...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={T.muted} />
              </TouchableOpacity>

              {formData.type === 'Expense' && (
                <>
                  <Label text="Category" />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {CATEGORIES.map(c => (
                        <TouchableOpacity key={c} style={[{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: T.bg },
                          formData.category === c && { backgroundColor: T.primary, borderColor: T.primary }]}
                          onPress={() => setFormData({ ...formData, category: c })}>
                          <Text style={[{ fontSize: 12, fontWeight: '600', color: T.muted }, formData.category === c && { color: '#FFF' }]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <Label text="Description" />
              <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={formData.description}
                onChangeText={v => setFormData({ ...formData, description: v })} placeholder="Optional notes..." multiline />
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: T.bg }]} onPress={() => setModalVisible(false)}>
                <Text style={{ fontWeight: '600', color: T.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-transaction-btn" style={[s.modalBtn, { backgroundColor: T.primary }]} onPress={handleSave}>
                <Text style={{ fontWeight: '600', color: '#FFF' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Picker Modal */}
      <Modal animationType="fade" transparent visible={projectPickerVisible} onRequestClose={() => setProjectPickerVisible(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setProjectPickerVisible(false)}>
          <View style={[s.modalBox, { maxHeight: '50%' }]}>
            <View style={s.modalHeader}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: T.text }}>Select Project</Text>
              <TouchableOpacity onPress={() => setProjectPickerVisible(false)}><Ionicons name="close" size={24} color={T.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}
                onPress={() => { setFormData({ ...formData, linked_project_id: '', linked_project_name: '' }); setProjectPickerVisible(false); }}>
                <Text style={{ color: T.muted }}>None</Text>
              </TouchableOpacity>
              {projects.map(p => (
                <TouchableOpacity key={p.id} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}
                  onPress={() => { setFormData({ ...formData, linked_project_id: p.id, linked_project_name: p.name }); setProjectPickerVisible(false); }}>
                  <Text style={{ fontWeight: '600', color: T.text }}>{p.name}</Text>
                  <Text style={{ fontSize: 12, color: T.muted }}>{p.status}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '600', color: '#212121', marginBottom: 6, marginTop: 12 }}>{text}</Text>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg },
  card: { backgroundColor: T.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  typeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 4 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: T.primary, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: T.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalActions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15, color: T.text, backgroundColor: T.bg },
  chipBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', backgroundColor: T.bg },
});
