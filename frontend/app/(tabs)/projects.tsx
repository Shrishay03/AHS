import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApi } from '../../src/useApi';

const T = { primary: '#2E7D32', secondary: '#1976D2', bg: '#F5F5F5', card: '#FFF', text: '#212121', muted: '#757575', ok: '#4CAF50', warn: '#FF9800', err: '#F44336' };

export default function Projects() {
  const { apiFetch } = useApi();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [bagModalVisible, setBagModalVisible] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', initial_plaster_area: '', final_plastered_area: '',
    invoiced_amount: '', amount_received: '', status: 'Pending',
  });
  const [bagForm, setBagForm] = useState({ bag_type: 'Naturoplast', quantity: '', date: new Date().toISOString().slice(0, 10) });
  const [selectedProjectForBag, setSelectedProjectForBag] = useState<any>(null);

  const fetchProjects = async () => {
    try {
      const r = await apiFetch('/api/projects');
      setProjects(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchDetail = async (id: string) => {
    try {
      const r = await apiFetch(`/api/projects/${id}`);
      setDetailData(await r.json());
    } catch (e) { console.error(e); }
  };

  useFocusEffect(useCallback(() => { fetchProjects(); }, []));

  const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = dateStr.slice(0, 10).split('-');
  return `${d[2]}-${d[1]}-${d[0]}`;
};

  const openAdd = () => {
    setEditingProject(null);
    setFormData({ name: '', initial_plaster_area: '', final_plastered_area: '', invoiced_amount: '', amount_received: '', status: 'Pending' });
    setModalVisible(true);
  };

  const openEdit = (p: any) => {
    setEditingProject(p);
    setFormData({
      name: p.name, initial_plaster_area: p.initial_plaster_area?.toString() || '',
      final_plastered_area: p.final_plastered_area?.toString() || '',
      invoiced_amount: p.invoiced_amount?.toString() || '',
      amount_received: p.amount_received?.toString() || '', status: p.status,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.invoiced_amount) { Alert.alert('Error', 'Name and Invoiced Amount are required'); return; }
    try {
      const payload = {
        name: formData.name,
        initial_plaster_area: parseFloat(formData.initial_plaster_area) || 0,
        final_plastered_area: parseFloat(formData.final_plastered_area) || 0,
        bag_usage_history: editingProject?.bag_usage_history || [],
        invoiced_amount: parseFloat(formData.invoiced_amount) || 0,
        amount_received: parseFloat(formData.amount_received) || 0,
        status: formData.status,
      };
      const url = editingProject ? `/api/projects/${editingProject.id}` : `/api/projects`;
      const r = await apiFetch(url, { method: editingProject ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      if (r.ok) { setModalVisible(false); fetchProjects(); }
    } catch (e) { Alert.alert('Error', 'Failed to save'); }
  };

  const handleDelete = (p: any) => {
    Alert.alert('Delete Project', `Delete "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await apiFetch(`/api/projects/${p.id}`, { method: 'DELETE' });
        fetchProjects();
      }},
    ]);
  };

  const openBagUsage = (p: any) => {
    setSelectedProjectForBag(p);
    setBagForm({ bag_type: 'Naturoplast', quantity: '', date: new Date().toISOString().slice(0, 10) });
    setBagModalVisible(true);
  };

  const handleAddBagUsage = async () => {
    if (!bagForm.quantity) { Alert.alert('Error', 'Enter quantity'); return; }
    try {
      const payload = {
        project_id: selectedProjectForBag.id,
        date: bagForm.date, bag_type: bagForm.bag_type,
        quantity: parseInt(bagForm.quantity),
      };
      const r = await apiFetch(`/api/projects/${selectedProjectForBag.id}/bag-usage`, {
        method: 'POST', body: JSON.stringify(payload),
      });
      if (r.ok) { setBagModalVisible(false); fetchProjects(); Alert.alert('Success', 'Bag usage added'); }
    } catch (e) { Alert.alert('Error', 'Failed to add'); }
  };

  const openDetail = (p: any) => { setDetailId(p.id); fetchDetail(p.id); };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={T.primary} /></View>;

  // Detail view
  if (detailId && detailData) {
    return (
      <View style={s.container}>
        <View style={{ backgroundColor: T.primary, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => { setDetailId(null); setDetailData(null); }}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF', flex: 1 }}>{detailData.name}</Text>
          <View style={{ backgroundColor: detailData.status === 'Completed' ? '#E8F5E9' : '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '600' }}>{detailData.status}</Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Project Info */}
          <View style={s.card}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text, marginBottom: 12 }}>Project Details</Text>
            <Row label="Initial Area" value={`${detailData.initial_plaster_area} sq.ft`} />
            <Row label="Final Area" value={`${detailData.final_plastered_area} sq.ft`} />
            <Row label="Bags Used" value={`${detailData.bags_used || 0}`} />
            <Row label="Invoiced" value={fmt(detailData.invoiced_amount)} />
            <Row label="Received" value={fmt(detailData.amount_received)} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 8, borderTopWidth: 2, borderTopColor: T.warn }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text }}>Pending</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: T.warn }}>{fmt(detailData.pending_amount)}</Text>
            </View>
          </View>

          {/* Bag Usage History */}
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text }}>Bag Usage History</Text>
              <TouchableOpacity testID="add-bag-usage-btn" style={{ backgroundColor: T.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                onPress={() => openBagUsage(detailData)}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {(detailData.bag_usage_history || []).length === 0 ? (
              <Text style={{ color: T.muted, fontSize: 13 }}>No bag usage recorded yet</Text>
            ) : (
              (detailData.bag_usage_history || []).map((e: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>{e.bag_type}</Text>
                    <Text style={{ fontSize: 11, color: T.muted }}>{typeof e.date === 'string' ? formatDate(e.date) : ''}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.secondary }}>{e.quantity} bags</Text>
                </View>
              ))
            )}
          </View>

          {/* Linked Transactions */}
          <View style={s.card}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text, marginBottom: 12 }}>Linked Transactions</Text>
            {(detailData.linked_transactions || []).length === 0 ? (
              <Text style={{ color: T.muted, fontSize: 13 }}>No transactions linked to this project</Text>
            ) : (
              (detailData.linked_transactions || []).map((t: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>{t.description || t.category || t.type}</Text>
                    <Text style={{ fontSize: 11, color: T.muted }}>{typeof t.date === 'string' ? formatDate(t.date) : ''} | {t.mode}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: t.type === 'Income' ? T.ok : T.err }}>
                    {t.type === 'Income' ? '+' : '-'}{fmt(t.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // List view
  return (
    <View style={s.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} colors={[T.primary]} />}>
        {projects.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <Ionicons name="folder-open-outline" size={64} color={T.muted} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: T.text, marginTop: 16 }}>No projects yet</Text>
          </View>
        ) : (
          projects.map((p) => (
            <TouchableOpacity key={p.id} style={s.card} onPress={() => openDetail(p)} testID={`project-card-${p.id}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: T.text, flex: 1 }}>{p.name}</Text>
                <View style={{ backgroundColor: p.status === 'Completed' ? '#E8F5E9' : '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600' }}>{p.status}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: T.muted }}>Invoiced: {fmt(p.invoiced_amount)}</Text>
                <Text style={{ fontSize: 12, color: T.warn }}>Pending: {fmt(p.pending_amount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: T.muted }}>Bags: {p.bags_used || 0}</Text>
                <Text style={{ fontSize: 12, color: T.muted }}>Area: {p.initial_plaster_area}/{p.final_plastered_area} sq.ft</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity testID={`add-bags-${p.id}`} style={[s.actBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => openBagUsage(p)}>
                  <Ionicons name="cube-outline" size={16} color={T.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: T.primary }}>Add Bags</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => openEdit(p)}>
                  <Ionicons name="create-outline" size={16} color={T.secondary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: T.secondary }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDelete(p)}>
                  <Ionicons name="trash-outline" size={16} color={T.err} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity testID="add-project-fab" style={s.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Project Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: T.text }}>{editingProject ? 'Edit Project' : 'Add Project'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color={T.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <Label text="Project Name *" />
              <TextInput style={s.input} value={formData.name} onChangeText={v => setFormData({ ...formData, name: v })} placeholder="Enter name" />
              <Label text="Initial Plaster Area (sq.ft)" />
              <TextInput style={s.input} value={formData.initial_plaster_area} onChangeText={v => setFormData({ ...formData, initial_plaster_area: v })} keyboardType="numeric" placeholder="0" />
              <Label text="Final Plastered Area (sq.ft)" />
              <TextInput style={s.input} value={formData.final_plastered_area} onChangeText={v => setFormData({ ...formData, final_plastered_area: v })} keyboardType="numeric" placeholder="0" />
              <Label text="Invoiced Amount *" />
              <TextInput style={s.input} value={formData.invoiced_amount} onChangeText={v => setFormData({ ...formData, invoiced_amount: v })} keyboardType="numeric" placeholder="0" />
              <Label text="Amount Received" />
              <TextInput style={s.input} value={formData.amount_received} onChangeText={v => setFormData({ ...formData, amount_received: v })} keyboardType="numeric" placeholder="0" />
              <Label text="Status" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['Pending', 'Completed'].map(st => (
                  <TouchableOpacity key={st} style={[s.chipBtn, formData.status === st && { backgroundColor: T.primary, borderColor: T.primary }]}
                    onPress={() => setFormData({ ...formData, status: st })}>
                    <Text style={[{ fontSize: 13, fontWeight: '600', color: T.muted }, formData.status === st && { color: '#FFF' }]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: T.bg }]} onPress={() => setModalVisible(false)}>
                <Text style={{ fontWeight: '600', color: T.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-project-btn" style={[s.modalBtn, { backgroundColor: T.primary }]} onPress={handleSave}>
                <Text style={{ fontWeight: '600', color: '#FFF' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Bag Usage Modal */}
      <Modal animationType="slide" transparent visible={bagModalVisible} onRequestClose={() => setBagModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: T.text }}>Add Bag Usage</Text>
              <TouchableOpacity onPress={() => setBagModalVisible(false)}><Ionicons name="close" size={26} color={T.text} /></TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>Project: {selectedProjectForBag?.name}</Text>
              <Label text="Bag Type" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['Naturoplast', 'Iraniya'].map(bt => (
                  <TouchableOpacity key={bt} style={[s.chipBtn, { flex: 1 }, bagForm.bag_type === bt && { backgroundColor: bt === 'Naturoplast' ? T.primary : T.warn, borderColor: bt === 'Naturoplast' ? T.primary : T.warn }]}
                    onPress={() => setBagForm({ ...bagForm, bag_type: bt })}>
                    <Text style={[{ fontSize: 13, fontWeight: '600', color: T.muted, textAlign: 'center' }, bagForm.bag_type === bt && { color: '#FFF' }]}>{bt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Label text="Quantity (bags) *" />
              <TextInput style={s.input} value={bagForm.quantity} onChangeText={v => setBagForm({ ...bagForm, quantity: v })} keyboardType="numeric" placeholder="0" />
              <Label text="Date" />
              <TextInput style={s.input} value={bagForm.date} onChangeText={v => setBagForm({ ...bagForm, date: v })} placeholder="DD-MM-YYYY" />
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: T.bg }]} onPress={() => setBagModalVisible(false)}>
                <Text style={{ fontWeight: '600', color: T.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-bag-usage-btn" style={[s.modalBtn, { backgroundColor: T.primary }]} onPress={handleAddBagUsage}>
                <Text style={{ fontWeight: '600', color: '#FFF' }}>Add</Text>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
      <Text style={{ fontSize: 13, color: '#757575' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#212121' }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg },
  card: { backgroundColor: T.card, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
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
