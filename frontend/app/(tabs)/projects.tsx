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

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    initial_plaster_area: '',
    final_plastered_area: '',
    bags_used: '',
    invoiced_amount: '',
    amount_received: '',
    status: 'Pending',
  });

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`);
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const openAddModal = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      initial_plaster_area: '',
      final_plastered_area: '',
      bags_used: '',
      invoiced_amount: '',
      amount_received: '',
      status: 'Pending',
    });
    setModalVisible(true);
  };

  const openEditModal = (project: any) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      initial_plaster_area: project.initial_plaster_area.toString(),
      final_plastered_area: project.final_plastered_area.toString(),
      bags_used: project.bags_used.toString(),
      invoiced_amount: project.invoiced_amount.toString(),
      amount_received: project.amount_received.toString(),
      status: project.status,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.invoiced_amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        initial_plaster_area: parseFloat(formData.initial_plaster_area) || 0,
        final_plastered_area: parseFloat(formData.final_plastered_area) || 0,
        bags_used: parseInt(formData.bags_used) || 0,
        invoiced_amount: parseFloat(formData.invoiced_amount) || 0,
        amount_received: parseFloat(formData.amount_received) || 0,
        status: formData.status,
      };

      const url = editingProject
        ? `${BACKEND_URL}/api/projects/${editingProject.id}`
        : `${BACKEND_URL}/api/projects`;
      
      const method = editingProject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setModalVisible(false);
        fetchProjects();
      }
    } catch (error) {
      console.error('Error saving project:', error);
      Alert.alert('Error', 'Failed to save project');
    }
  };

  const handleDelete = (project: any) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/projects/${project.id}`, {
                method: 'DELETE',
              });
              fetchProjects();
            } catch (error) {
              console.error('Error deleting project:', error);
            }
          },
        },
      ]
    );
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
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={THEME.textLight} />
            <Text style={styles.emptyText}>No projects yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first project</Text>
          </View>
        ) : (
          projects.map((project) => (
            <View key={project.id} style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{project.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    project.status === 'Completed'
                      ? styles.completedBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text style={styles.statusText}>{project.status}</Text>
                </View>
              </View>

              <View style={styles.projectDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Area (Initial/Final):</Text>
                  <Text style={styles.detailValue}>
                    {project.initial_plaster_area} / {project.final_plastered_area} sq.ft
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bags Used:</Text>
                  <Text style={styles.detailValue}>{project.bags_used}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Invoiced:</Text>
                  <Text style={styles.detailValue}>
                    ₹{project.invoiced_amount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Received:</Text>
                  <Text style={styles.detailValue}>
                    ₹{project.amount_received.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.detailRow, styles.pendingRow]}>
                  <Text style={styles.detailLabel}>Pending:</Text>
                  <Text style={[styles.detailValue, styles.pendingAmount]}>
                    ₹{project.pending_amount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.projectActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(project)}
                >
                  <Ionicons name="create-outline" size={20} color={THEME.secondary} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(project)}
                >
                  <Ionicons name="trash-outline" size={20} color={THEME.error} />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
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
                {editingProject ? 'Edit Project' : 'Add Project'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Project Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter project name"
              />

              <Text style={styles.inputLabel}>Initial Plaster Area (sq.ft)</Text>
              <TextInput
                style={styles.input}
                value={formData.initial_plaster_area}
                onChangeText={(text) =>
                  setFormData({ ...formData, initial_plaster_area: text })
                }
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Final Plastered Area (sq.ft)</Text>
              <TextInput
                style={styles.input}
                value={formData.final_plastered_area}
                onChangeText={(text) =>
                  setFormData({ ...formData, final_plastered_area: text })
                }
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Bags Used</Text>
              <TextInput
                style={styles.input}
                value={formData.bags_used}
                onChangeText={(text) => setFormData({ ...formData, bags_used: text })}
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Invoiced Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={formData.invoiced_amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, invoiced_amount: text })
                }
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Amount Received (₹)</Text>
              <TextInput
                style={styles.input}
                value={formData.amount_received}
                onChangeText={(text) =>
                  setFormData({ ...formData, amount_received: text })
                }
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    formData.status === 'Pending' && styles.statusButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'Pending' })}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.status === 'Pending' && styles.statusButtonTextActive,
                    ]}
                  >
                    Pending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    formData.status === 'Completed' && styles.statusButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'Completed' })}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.status === 'Completed' && styles.statusButtonTextActive,
                    ]}
                  >
                    Completed
                  </Text>
                </TouchableOpacity>
              </View>
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
  projectCard: {
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
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pendingRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: THEME.warning,
  },
  detailLabel: {
    fontSize: 14,
    color: THEME.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  pendingAmount: {
    fontSize: 16,
    color: THEME.warning,
  },
  projectActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 14,
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
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  statusButtonActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textLight,
  },
  statusButtonTextActive: {
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
