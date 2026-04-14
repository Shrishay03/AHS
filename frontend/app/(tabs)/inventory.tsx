import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApi } from '../../src/useApi';

const T = { primary: '#2E7D32', secondary: '#1976D2', bg: '#F5F5F5', card: '#FFF', text: '#212121', muted: '#757575', ok: '#4CAF50', warn: '#FF9800', err: '#F44336' };

export default function Inventory() {
  const { apiFetch } = useApi();
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({ bags: '', amount: '', bag_type: 'Naturoplast', date: new Date().toISOString().slice(0, 10), mode: 'Bank' });

  const fetchInventory = async () => {
    try {
      const r = await apiFetch(`/api/inventory`);
      setInventory(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchInventory(); }, []));

  const handlePurchase = async () => {
    if (!formData.bags || !formData.amount) { Alert.alert('Error', 'Fill all fields'); return; }
    try {
      const payload = {
        bags: parseInt(formData.bags), bag_type: formData.bag_type,
        amount: parseFloat(formData.amount), date: formData.date, mode: formData.mode,
      };
      const r = await apiFetch(`/api/inventory/purchase`, {
        method: 'POST', body: JSON.stringify(payload),
      });
      if (r.ok) { setModalVisible(false); setFormData({ bags: '', amount: '', bag_type: 'Naturoplast', date: new Date().toISOString().slice(0, 10), mode: 'Bank' }); fetchInventory(); Alert.alert('Success', 'Purchase added'); }
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={T.primary} /></View>;

  const pricePerBag = formData.bags && formData.amount ? (parseFloat(formData.amount) / parseInt(formData.bags)).toFixed(2) : null;

  return (
    <View style={s.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInventory(); }} colors={[T.primary]} />}>

        {/* Total Stock */}
        <View style={[s.card, { backgroundColor: T.secondary, alignItems: 'center', padding: 24 }]}>
          <Ionicons name="cube" size={36} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 14, marginTop: 8, opacity: 0.9 }}>Total Stock</Text>
          <Text testID="total-stock" style={{ fontSize: 56, fontWeight: 'bold', color: '#FFF' }}>{inventory?.current_stock || 0}</Text>
          <Text style={{ color: '#FFF', fontSize: 12, opacity: 0.8 }}>Bags Available</Text>
        </View>

        {/* Per Type Breakdown */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={[s.card, { flex: 1, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: T.primary }]}>
            <Text style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Naturoplast</Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: T.primary }}>{inventory?.naturoplast_stock || 0}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Text style={{ fontSize: 10, color: T.ok }}>+{inventory?.naturoplast_purchased || 0}</Text>
              <Text style={{ fontSize: 10, color: T.err }}>-{inventory?.naturoplast_used || 0}</Text>
            </View>
          </View>
          <View style={[s.card, { flex: 1, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: T.warn }]}>
            <Text style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Iraniya</Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: T.warn }}>{inventory?.iraniya_stock || 0}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Text style={{ fontSize: 10, color: T.ok }}>+{inventory?.iraniya_purchased || 0}</Text>
              <Text style={{ fontSize: 10, color: T.err }}>-{inventory?.iraniya_used || 0}</Text>
            </View>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={[s.card, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text, marginBottom: 12 }}>Summary</Text>
          <Row label="Total Purchased" value={`${inventory?.total_purchased || 0} bags`} />
          <Row label="Total Used (Projects)" value={`${inventory?.total_used || 0} bags`} />
          <Row label="Current Stock" value={`${inventory?.current_stock || 0} bags`} highlight />
        </View>

        {/* Info */}
        <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: T.secondary, marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="information-circle" size={20} color={T.secondary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: T.text }}>How It Works</Text>
          </View>
          <Text style={{ fontSize: 13, color: T.muted, lineHeight: 20 }}>
            {'\u2022'} Purchase bags here (Naturoplast or Iraniya){'\n'}
            {'\u2022'} Use bags from Projects tab (Add Bag Usage){'\n'}
            {'\u2022'} Stock auto-deducts based on project usage
          </Text>
        </View>

        {/* Purchase History */}
        {(inventory?.purchase_history || []).length > 0 && (
          <View style={s.card}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text, marginBottom: 12 }}>Purchase History</Text>
            {(inventory?.purchase_history || []).map((p: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>{p.bag_type} - {p.bags} bags</Text>
                  <Text style={{ fontSize: 11, color: T.muted }}>{typeof p.date === 'string' ? p.date.slice(0, 10) : ''} | {p.mode}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.err }}>{'\u20b9'}{(p.amount || 0).toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Add Purchase Button */}
        <TouchableOpacity testID="add-purchase-btn" style={{ backgroundColor: T.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 8 }}
          onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={22} color="#FFF" />
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>Add Bags Purchase</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Purchase Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: T.text }}>Add Bags Purchase</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color={T.text} /></TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <Label text="Bag Type" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['Naturoplast', 'Iraniya'].map(bt => (
                  <TouchableOpacity key={bt} style={[s.chipBtn, formData.bag_type === bt && { backgroundColor: bt === 'Naturoplast' ? T.primary : T.warn, borderColor: bt === 'Naturoplast' ? T.primary : T.warn }]}
                    onPress={() => setFormData({ ...formData, bag_type: bt })}>
                    <Text style={[{ fontSize: 13, fontWeight: '600', color: T.muted }, formData.bag_type === bt && { color: '#FFF' }]}>{bt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Label text="Number of Bags *" />
              <TextInput style={s.input} value={formData.bags} onChangeText={v => setFormData({ ...formData, bags: v })} keyboardType="numeric" placeholder="0" />

              <Label text="Total Amount *" />
              <TextInput style={s.input} value={formData.amount} onChangeText={v => setFormData({ ...formData, amount: v })} keyboardType="numeric" placeholder="0" />

              <Label text="Payment Mode" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Bank', 'Petty Cash'].map(m => (
                  <TouchableOpacity key={m} style={[s.chipBtn, formData.mode === m && { backgroundColor: T.secondary, borderColor: T.secondary }]}
                    onPress={() => setFormData({ ...formData, mode: m })}>
                    <Text style={[{ fontSize: 12, fontWeight: '600', color: T.muted }, formData.mode === m && { color: '#FFF' }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Label text="Date" />
              <TextInput style={s.input} value={formData.date} onChangeText={v => setFormData({ ...formData, date: v })} placeholder="YYYY-MM-DD" />

              {pricePerBag && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, backgroundColor: '#F0F0F0', borderRadius: 8 }}>
                  <Ionicons name="calculator-outline" size={16} color={T.muted} />
                  <Text style={{ fontSize: 13, color: T.muted }}>{'\u20b9'}{pricePerBag} per bag</Text>
                </View>
              )}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: T.bg }]} onPress={() => setModalVisible(false)}>
                <Text style={{ fontWeight: '600', color: T.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-purchase-btn" style={[s.modalBtn, { backgroundColor: T.primary }]} onPress={handlePurchase}>
                <Text style={{ fontWeight: '600', color: '#FFF' }}>Add Purchase</Text>
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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: highlight ? 0 : 1, borderBottomColor: '#F0F0F0',
      ...(highlight ? { borderTopWidth: 2, borderTopColor: '#1976D2', marginTop: 8, paddingTop: 10 } : {}) }}>
      <Text style={{ fontSize: 13, color: highlight ? '#212121' : '#757575', fontWeight: highlight ? 'bold' : 'normal' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: highlight ? '#1976D2' : '#212121' }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg },
  card: { backgroundColor: T.card, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: T.card, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalActions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15, color: T.text, backgroundColor: T.bg },
  chipBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', backgroundColor: T.bg },
});
