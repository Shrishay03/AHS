import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const T = { primary: '#2E7D32', secondary: '#1976D2', bg: '#F5F5F5', card: '#FFF', text: '#212121', muted: '#757575', ok: '#4CAF50', warn: '#FF9800', err: '#F44336' };

export default function Partners() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [txnModalVisible, setTxnModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', total_investment: '' });
  const [txnData, setTxnData] = useState({ amount: '', type: 'Investment', date: new Date().toISOString().slice(0, 10) });

  const fetchPartners = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/partners`);
      setPartners(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchPartners(); }, []));

  const fmt = (n: number) => `\u20b9${(n || 0).toLocaleString('en-IN')}`;

  const openAdd = () => { setEditingPartner(null); setFormData({ name: '', total_investment: '' }); setModalVisible(true); };

  const openEdit = (p: any) => {
    setEditingPartner(p);
    setFormData({ name: p.name, total_investment: p.total_investment?.toString() || '' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name) { Alert.alert('Error', 'Enter name'); return; }
    try {
      const payload = { name: formData.name, total_investment: parseFloat(formData.total_investment) || 0 };
      const url = editingPartner ? `${BACKEND_URL}/api/partners/${editingPartner.id}` : `${BACKEND_URL}/api/partners`;
      const r = await fetch(url, { method: editingPartner ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) { setModalVisible(false); fetchPartners(); }
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const handleDelete = (p: any) => {
    Alert.alert('Delete Partner', `Delete "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await fetch(`${BACKEND_URL}/api/partners/${p.id}`, { method: 'DELETE' });
        fetchPartners();
      }},
    ]);
  };

  const openTxnModal = (p: any) => {
    setSelectedPartner(p);
    setTxnData({ amount: '', type: 'Investment', date: new Date().toISOString().slice(0, 10) });
    setTxnModalVisible(true);
  };

  const handleAddTxn = async () => {
    if (!txnData.amount) { Alert.alert('Error', 'Enter amount'); return; }
    try {
      const payload = {
        partner_id: selectedPartner.id,
        amount: parseFloat(txnData.amount),
        type: txnData.type,
        date: txnData.date,
      };
      const r = await fetch(`${BACKEND_URL}/api/partners/transaction`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (r.ok) { setTxnModalVisible(false); fetchPartners(); Alert.alert('Success', `${txnData.type} of ${fmt(parseFloat(txnData.amount))} recorded. Bank balance updated.`); }
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={T.primary} /></View>;

  return (
    <View style={s.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPartners(); }} colors={[T.primary]} />}>
        {partners.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <Ionicons name="people-outline" size={64} color={T.muted} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: T.text, marginTop: 16 }}>No partners yet</Text>
          </View>
        ) : (
          partners.map((p) => (
            <View key={p.id} style={s.card}>
              <TouchableOpacity onPress={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: T.primary, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF' }}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: T.text }}>{p.name}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: p.current_balance >= 0 ? T.ok : T.err }}>
                      Balance: {fmt(p.current_balance)}
                    </Text>
                  </View>
                  <Ionicons name={expandedId === p.id ? 'chevron-up' : 'chevron-down'} size={22} color={T.muted} />
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10 }}>
                  <Text style={{ fontSize: 11, color: T.muted }}>Invested</Text>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: T.ok }}>{fmt(p.total_investment)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10 }}>
                  <Text style={{ fontSize: 11, color: T.muted }}>Withdrawn</Text>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: T.err }}>{fmt(p.total_withdrawals)}</Text>
                </View>
              </View>

              {/* Transaction History (Expandable) */}
              {expandedId === p.id && (
                <View style={{ marginBottom: 12, backgroundColor: T.bg, borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: T.text, marginBottom: 8 }}>Transaction History</Text>
                  {(p.transaction_history || []).length === 0 ? (
                    <Text style={{ fontSize: 12, color: T.muted }}>No transactions yet</Text>
                  ) : (
                    (p.transaction_history || []).map((t: any, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: T.text }}>{t.type}</Text>
                          <Text style={{ fontSize: 11, color: T.muted }}>{typeof t.date === 'string' ? t.date.slice(0, 10) : ''}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: t.type === 'Investment' ? T.ok : T.err }}>
                          {t.type === 'Investment' ? '+' : '-'}{fmt(t.amount)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity testID={`add-partner-txn-${p.id}`} style={[s.actBtn, { flex: 2, backgroundColor: '#E8F5E9' }]} onPress={() => openTxnModal(p)}>
                  <Ionicons name="cash-outline" size={16} color={T.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: T.primary }}>Add Transaction</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => openEdit(p)}>
                  <Ionicons name="create-outline" size={16} color={T.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDelete(p)}>
                  <Ionicons name="trash-outline" size={16} color={T.err} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                <Ionicons name="information-circle-outline" size={14} color={T.muted} />
                <Text style={{ fontSize: 10, color: T.muted }}>Investments/withdrawals affect bank balance</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity testID="add-partner-fab" style={s.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Partner Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: T.text }}>{editingPartner ? 'Edit Partner' : 'Add Partner'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color={T.text} /></TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <Label text="Partner Name *" />
              <TextInput style={s.input} value={formData.name} onChangeText={v => setFormData({ ...formData, name: v })} placeholder="Enter name" />
              <Label text="Initial Investment" />
              <TextInput style={s.input} value={formData.total_investment} onChangeText={v => setFormData({ ...formData, total_investment: v })} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: T.bg }]} onPress={() => setModalVisible(false)}>
                <Text style={{ fontWeight: '600', color: T.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-partner-btn" style={[s.modalBtn, { backgroundColor: T.primary }]} onPress={handleSave}>
                <Text style={{ fontWeight: '600', color: '#FFF' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Partner Transaction Modal */}
      <Modal animationType="slide" transparent visible={txnModalVisible} onRequestClose={() => setTxnModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: T.text }}>Partner Transaction</Text>
              <TouchableOpacity onPress={() => setTxnModalVisible(false)}><Ionicons name="close" size={26} color={T.text} /></TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>Partner: {selectedPartner?.name}</Text>

              <Label text="Type" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['Investment', 'Withdrawal'].map(tp => (
                  <TouchableOpacity key={tp} style={[s.chipBtn, txnData.type === tp && { backgroundColor: tp === 'Investment' ? T.ok : T.err, borderColor: tp === 'Investment' ? T.ok : T.err }]}
                    onPress={() => setTxnData({ ...txnData, type: tp })}>
                    <Text style={[{ fontSize: 13, fontWeight: '600', color: T.muted }, txnData.type === tp && { color: '#FFF' }]}>{tp}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Label text="Amount *" />
              <TextInput style={s.input} value={txnData.amount} onChangeText={v => setTxnData({ ...txnData, amount: v })} keyboardType="numeric" placeholder="0" />

              <Label text="Date *" />
              <TextInput style={s.input} value={txnData.date} onChangeText={v => setTxnData({ ...txnData, date: v })} placeholder="YYYY-MM-DD" />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, backgroundColor: '#E3F2FD', borderRadius: 8 }}>
                <Ionicons name="business-outline" size={16} color={T.secondary} />
                <Text style={{ fontSize: 12, color: T.secondary }}>
                  {txnData.type === 'Investment' ? 'This will ADD to bank balance' : 'This will DEDUCT from bank balance'}
                </Text>
              </View>
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: T.bg }]} onPress={() => setTxnModalVisible(false)}>
                <Text style={{ fontWeight: '600', color: T.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-partner-txn-btn" style={[s.modalBtn, { backgroundColor: T.primary }]} onPress={handleAddTxn}>
                <Text style={{ fontWeight: '600', color: '#FFF' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  card: { backgroundColor: T.card, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 4 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: T.primary, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: T.card, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalActions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15, color: T.text, backgroundColor: T.bg },
  chipBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', backgroundColor: T.bg },
});
