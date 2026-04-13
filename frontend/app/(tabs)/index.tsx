import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overview</Text>
        <Text style={styles.headerSubtitle}>Real-time business metrics</Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Total Balance Card */}
        <View style={[styles.card, styles.primaryCard]}>
          <View style={styles.cardIcon}>
            <Ionicons name="wallet" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.cardLabelPrimary}>Total Balance</Text>
          <Text style={styles.cardValuePrimary}>
            ₹{dashboardData?.total_balance?.toLocaleString('en-IN') || '0'}
          </Text>
          <View style={styles.balanceBreakdown}>
            <Text style={styles.breakdownText}>Bank: ₹{dashboardData?.bank_balance?.toLocaleString('en-IN') || '0'}</Text>
            <Text style={styles.breakdownText}>Petty Cash: ₹{dashboardData?.petty_cash_balance?.toLocaleString('en-IN') || '0'}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.receivablesCard]}>
            <Ionicons name="trending-up" size={24} color={THEME.warning} />
            <Text style={styles.statValue}>
              ₹{dashboardData?.total_receivables?.toLocaleString('en-IN') || '0'}
            </Text>
            <Text style={styles.statLabel}>Receivables</Text>
          </View>

          <View style={[styles.statCard, styles.expensesCard]}>
            <Ionicons name="trending-down" size={24} color={THEME.error} />
            <Text style={styles.statValue}>
              ₹{dashboardData?.total_expenses?.toLocaleString('en-IN') || '0'}
            </Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
        </View>

        {/* Stock Card */}
        <View style={[styles.card, styles.stockCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube" size={24} color={THEME.secondary} />
            <Text style={styles.stockLabel}>Bags in Stock</Text>
          </View>
          <Text style={styles.stockValue}>{dashboardData?.total_stock || 0}</Text>
          <Text style={styles.stockSubtext}>Available for projects</Text>
        </View>
      </View>
    </ScrollView>
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
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: THEME.textLight,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: THEME.primary,
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardLabelPrimary: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValuePrimary: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  breakdownText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receivablesCard: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.warning,
  },
  expensesCard: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.error,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockCard: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.secondary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stockLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  stockValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: THEME.secondary,
    marginBottom: 4,
  },
  stockSubtext: {
    fontSize: 12,
    color: THEME.textLight,
  },
});
