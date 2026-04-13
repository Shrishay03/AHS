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

export default function Inventory() {
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    bags: '',
    amount: '',
  });

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/inventory`);
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const handleAddPurchase = async () => {
    if (!formData.bags || !formData.amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const payload = {
        bags: parseInt(formData.bags),
        amount: parseFloat(formData.amount),
        date: new Date().toISOString(),
      };

      const response = await fetch(`${BACKEND_URL}/api/inventory/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setModalVisible(false);
        setFormData({ bags: '', amount: '' });
        fetchInventory();
        Alert.alert('Success', 'Purchase added successfully');
      }
    } catch (error) {
      console.error('Error adding purchase:', error);
      Alert.alert('Error', 'Failed to add purchase');
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
        {/* Main Stock Card */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <Ionicons name="cube" size={40} color={THEME.secondary} />
            <Text style={styles.mainCardTitle}>Current Stock</Text>
          </View>
          <Text style={styles.mainCardValue}>{inventory?.current_stock || 0}</Text>
          <Text style={styles.mainCardSubtitle}>Bags Available</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="add-circle" size={28} color={THEME.success} />
            </View>
            <Text style={styles.statValue}>{inventory?.total_bags_purchased || 0}</Text>
            <Text style={styles.statLabel}>Total Purchased</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="remove-circle" size={28} color={THEME.error} />
            </View>
            <Text style={styles.statValue}>{inventory?.bags_used || 0}</Text>
            <Text style={styles.statLabel}>Bags Used</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={THEME.secondary} />
            <Text style={styles.infoTitle}>Inventory Management</Text>
          </View>
          <Text style={styles.infoText}>
            • Add bags when you make a purchase{' \n'}
            • Bags used are automatically calculated from projects{' \n'}
            • Current stock shows available bags for new projects
          </Text>
        </View>

        {/* Add Purchase Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Bags Purchase</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Purchase Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Bags Purchase</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Number of Bags *</Text>
              <TextInput
                style={styles.input}
                value={formData.bags}
                onChangeText={(text) => setFormData({ ...formData, bags: text })}
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Total Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0"
                keyboardType="numeric"
              />

              <View style={styles.priceInfo}>
                <Ionicons name="calculator-outline" size={16} color={THEME.textLight} />
                <Text style={styles.priceInfoText}>
                  {formData.bags && formData.amount
                    ? `₹${(parseFloat(formData.amount) / parseInt(formData.bags)).toFixed(2)} per bag`
                    : 'Price per bag will be calculated'}
                </Text>
              </View>
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
                onPress={handleAddPurchase}
              >
                <Text style={styles.saveButtonText}>Add Purchase</Text>
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
  },
  mainCard: {
    backgroundColor: THEME.secondary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  mainCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mainCardValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  mainCardSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textLight,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: THEME.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  infoText: {
    fontSize: 14,
    color: THEME.textLight,
    lineHeight: 22,
  },
  addButton: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  priceInfoText: {
    fontSize: 13,
    color: THEME.textLight,
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
