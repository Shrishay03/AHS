import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const THEME = {
  primary: '#2E7D32',
  secondary: '#1976D2',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  textLight: '#757575',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
};

export default function Partners() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    total_investment: '',
  });
  const [transactionData, setTransactionData] = useState({
    amount: '',
    type: 'Investment',
  });

  const fetchPartners = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners`);
      const data = await response.json();
      setPartners(data);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPartners();
  };

  const openAddModal = () => {
    setEditingPartner(null);
    setFormData({ name: '', total_investment: '' });
    setModalVisible(true);
  };

  const openEditModal = (partner: any) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      total_investment: partner.total_investment.toString(),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter partner name');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        total_investment: parseFloat(formData.total_investment) || 0,
      };

      const url = editingPartner
        ? `${BACKEND_URL}/api/partners/${editingPartner.id}`
        : `${BACKEND_URL}/api/partners`;

      const method = editingPartner ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setModalVisible(false);
        fetchPartners();
      }
    } catch (error) {
      console.error('Error saving partner:', error);
      Alert.alert('Error', 'Failed to save partner');
    }
  };

  const handleDelete = (partner: any) => {
    Alert.alert(
      'Delete Partner',
      `Are you sure you want to delete "${partner.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/partners/${partner.id}`, {
                method: 'DELETE',
              });
              fetchPartners();
            } catch (error) {
              console.error('Error deleting partner:', error);
            }
          },
        },
      ]
    );
  };

  const openTransactionModal = (partner: any) => {
    setSelectedPartner(partner);
    setTransactionData({ amount: '', type: 'Investment' });
    setTransactionModalVisible(true);
  };

  const handleAddTransaction = async () => {
    if (!transactionData.amount) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    try {
      const payload = {
        partner_id: selectedPartner.id,
        amount: parseFloat(transactionData.amount),
        type: transactionData.type,
      };

      const response = await fetch(`${BACKEND_URL}/api/partners/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setTransactionModalVisible(false);
        fetchPartners();
        Alert.alert('Success', 'Transaction added successfully');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
        }
      >
        {partners.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={THEME.textLight} />
            <Text style={styles.emptyText}>No partners yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first partner</Text>
          </View>
        ) : (
          partners.map((partner) => (
            <View key={partner.id} style={styles.partnerCard}>
              <View style={styles.partnerHeader}>
                <View style={styles.partnerIcon}>
                  <Ionicons name="person" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <Text
                    style={[
                      styles.balanceText,
                      partner.current_balance >= 0 ? styles.positiveBalance : styles.negativeBalance,
                    ]}
                  >
                    Current Balance: ₹{partner.current_balance.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.partnerDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="arrow-down-circle" size={20} color={THEME.success} />
                  <View>
                    <Text style={styles.detailLabel}>Total Investment</Text>
                    <Text style={styles.detailValue}>
                      ₹{partner.total_investment.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="arrow-up-circle" size={20} color={THEME.error} />
                  <View>
                    <Text style={styles.detailLabel}>Total Withdrawals</Text>
                    <Text style={styles.detailValue}>
                      ₹{partner.total_withdrawals.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.partnerActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openTransactionModal(partner)}
                >
                  <Ionicons name="cash-outline" size={18} color={THEME.primary} />
                  <Text style={styles.actionButtonText}>Add Transaction</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => openEditModal(partner)}
                >
                  <Ionicons name="create-outline" size={18} color={THEME.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(partner)}
                >
                  <Ionicons name="trash-outline" size={18} color={THEME.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add/Edit Partner Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPartner ? 'Edit Partner' : 'Add Partner'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Partner Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter partner name"
              />

              <Text style={styles.inputLabel}>Initial Investment (₹)</Text>
              <TextInput
                style={styles.input}
                value={formData.total_investment}
                onChangeText={(text) => setFormData({ ...formData, total_investment: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={transactionModalVisible}
        onRequestClose={() => setTransactionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setTransactionModalVisible(false)}>
                <Ionicons name="close" size={28} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Partner: {selectedPartner?.name}</Text>

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionData.type === 'Investment' && styles.investmentButton,
                  ]}
                  onPress={() => setTransactionData({ ...transactionData, type: 'Investment' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionData.type === 'Investment' && styles.typeButtonTextActive,
                    ]}
                  >
                    Investment
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionData.type === 'Withdrawal' && styles.withdrawalButton,
                  ]}
                  onPress={() => setTransactionData({ ...transactionData, type: 'Withdrawal' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionData.type === 'Withdrawal' && styles.typeButtonTextActive,
                    ]}
                  >
                    Withdrawal
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={transactionData.amount}
                onChangeText={(text) => setTransactionData({ ...transactionData, amount: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setTransactionModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddTransaction}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.textLight,
    marginTop: 8,
  },
  partnerCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  partnerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  positiveBalance: {
    color: THEME.success,
  },
  negativeBalance: {
    color: THEME.error,
  },
  partnerDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: THEME.background,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: THEME.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  partnerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    gap: 6,
  },
  editButton: {
    flex: 0,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    flex: 0,
    paddingHorizontal: 12,
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: THEME.text,
    backgroundColor: THEME.background,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  investmentButton: {
    backgroundColor: THEME.success,
    borderColor: THEME.success,
  },
  withdrawalButton: {
    backgroundColor: THEME.error,
    borderColor: THEME.error,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textLight,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: THEME.background,
  },
  saveButton: {
    backgroundColor: THEME.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
