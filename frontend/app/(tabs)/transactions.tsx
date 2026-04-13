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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

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

const EXPENSE_CATEGORIES = [
  'Bags',
  'Labor',
  'Transport',
  'Materials',
  'Rent',
  'Electricity',
  'Food',
  'Misc',
];

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString(),
    amount: '',
    type: 'Expense',
    mode: 'Bank',
    linked_project_id: '',
    category: 'Bags',
    description: '',
  });

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`);
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchProjects();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormData({
      date: new Date().toISOString(),
      amount: '',
      type: 'Expense',
      mode: 'Bank',
      linked_project_id: '',
      category: 'Bags',
      description: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (transaction: any) => {
    setEditingTransaction(transaction);
    setFormData({
      date: transaction.date,
      amount: transaction.amount.toString(),
      type: transaction.type,
      mode: transaction.mode,
      linked_project_id: transaction.linked_project_id || '',
      category: transaction.category || 'Bags',
      description: transaction.description || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.amount) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    try {
      const payload = {
        date: formData.date,
        amount: parseFloat(formData.amount),
        type: formData.type,
        mode: formData.mode,
        linked_project_id: formData.linked_project_id || null,
        category: formData.type === 'Expense' ? formData.category : null,
        description: formData.description,
      };

      const url = editingTransaction
        ? `${BACKEND_URL}/api/transactions/${editingTransaction.id}`
        : `${BACKEND_URL}/api/transactions`;

      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setModalVisible(false);
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  const handleDelete = (transaction: any) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/transactions/${transaction.id}`, {
                method: 'DELETE',
              });
              fetchTransactions();
            } catch (error) {
              console.error('Error deleting transaction:', error);
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/export/transactions?format=csv`);
      const blob = await response.blob();
      Alert.alert('Export', 'Transactions exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('Error', 'Failed to export transactions');
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
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleExport}>
          <Ionicons name="download-outline" size={20} color={THEME.primary} />
          <Text style={styles.toolbarButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
        }
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={THEME.textLight} />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first transaction</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.typeIcon,
                      transaction.type === 'Income' ? styles.incomeIcon : styles.expenseIcon,
                    ]}
                  >
                    <Ionicons
                      name={transaction.type === 'Income' ? 'arrow-down' : 'arrow-up'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View>
                    <Text style={styles.transactionDate}>
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </Text>
                    <Text style={styles.transactionMode}>{transaction.mode}</Text>
                    {transaction.category && (
                      <Text style={styles.transactionCategory}>{transaction.category}</Text>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    transaction.type === 'Income' ? styles.incomeAmount : styles.expenseAmount,
                  ]}
                >
                  {transaction.type === 'Income' ? '+' : '-'}₹
                  {transaction.amount.toLocaleString('en-IN')}
                </Text>
              </View>

              {transaction.description && (
                <Text style={styles.transactionDescription}>{transaction.description}</Text>
              )}

              <View style={styles.transactionActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(transaction)}
                >
                  <Ionicons name="create-outline" size={18} color={THEME.secondary} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(transaction)}
                >
                  <Ionicons name="trash-outline" size={18} color={THEME.error} />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
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
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === 'Income' && styles.incomeButton,
                  ]}
                  onPress={() => setFormData({ ...formData, type: 'Income' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === 'Income' && styles.typeButtonTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === 'Expense' && styles.expenseButton,
                  ]}
                  onPress={() => setFormData({ ...formData, type: 'Expense' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === 'Expense' && styles.typeButtonTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Mode</Text>
              <View style={styles.modeButtons}>
                {['Bank', 'Petty Cash', 'Partner'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeButton,
                      formData.mode === mode && styles.modeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, mode })}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        formData.mode === mode && styles.modeButtonTextActive,
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.type === 'Expense' && (
                <>
                  <Text style={styles.inputLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryButtons}>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryButton,
                            formData.category === cat && styles.categoryButtonActive,
                          ]}
                          onPress={() => setFormData({ ...formData, category: cat })}
                        >
                          <Text
                            style={[
                              styles.categoryButtonText,
                              formData.category === cat && styles.categoryButtonTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Optional notes..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>

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
  toolbar: {
    backgroundColor: THEME.card,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    gap: 8,
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
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
  transactionCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomeIcon: {
    backgroundColor: THEME.success,
  },
  expenseIcon: {
    backgroundColor: THEME.error,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  transactionMode: {
    fontSize: 12,
    color: THEME.textLight,
    marginTop: 2,
  },
  transactionCategory: {
    fontSize: 11,
    color: THEME.secondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: THEME.success,
  },
  expenseAmount: {
    color: THEME.error,
  },
  transactionDescription: {
    fontSize: 13,
    color: THEME.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.secondary,
  },
  deleteButtonText: {
    color: THEME.error,
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
    maxHeight: '90%',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
  incomeButton: {
    backgroundColor: THEME.success,
    borderColor: THEME.success,
  },
  expenseButton: {
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
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  modeButtonActive: {
    backgroundColor: THEME.secondary,
    borderColor: THEME.secondary,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textLight,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: THEME.background,
  },
  categoryButtonActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textLight,
  },
  categoryButtonTextActive: {
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
