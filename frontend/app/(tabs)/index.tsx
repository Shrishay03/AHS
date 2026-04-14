import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const T = { primary: '#2E7D32', secondary: '#1976D2', bg: '#F5F5F5', card: '#FFF', text: '#212121', muted: '#757575', ok: '#4CAF50', warn: '#FF9800', err: '#F44336' };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [d, setD] = useState<any>(null);
  const [showReports, setShowReports] = useState(false);
  const [showBank, setShowBank] = useState(false);

  const fetchDashboard = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/dashboard`);
      setD(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchDashboard(); }, []));

  const fmt = (n: number) => `\u20b9${(n || 0).toLocaleString('en-IN')}`;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={T.primary} /></View>;

  const months = d?.monthly_breakdown ? Object.entries(d.monthly_breakdown).sort((a: any, b: any) => b[0].localeCompare(a[0])) : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} colors={[T.primary]} />}>

      {/* Main Balance Card */}
      <View style={[s.card, { backgroundColor: T.primary }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="wallet" size={28} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 14, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Balance</Text>
        </View>
        <Text testID="total-balance" style={{ fontSize: 36, fontWeight: 'bold', color: '#FFF', marginBottom: 12 }}>{fmt(d?.total_balance)}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
          <Text style={{ color: '#FFF', opacity: 0.8, fontSize: 12 }}>Bank: {fmt(d?.bank_balance)}</Text>
          <Text style={{ color: '#FFF', opacity: 0.8, fontSize: 12 }}>Petty Cash: {fmt(d?.petty_cash_balance)}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={[s.card, { flex: 1, borderLeftWidth: 4, borderLeftColor: T.warn, alignItems: 'center', padding: 14 }]}>
          <Ionicons name="trending-up" size={22} color={T.warn} />
          <Text testID="total-receivables" style={s.statVal}>{fmt(d?.total_receivables)}</Text>
          <Text style={s.statLbl}>Receivables</Text>
        </View>
        <View style={[s.card, { flex: 1, borderLeftWidth: 4, borderLeftColor: T.err, alignItems: 'center', padding: 14 }]}>
          <Ionicons name="trending-down" size={22} color={T.err} />
          <Text testID="total-expenses" style={s.statVal}>{fmt(d?.total_expenses)}</Text>
          <Text style={s.statLbl}>Expenses</Text>
        </View>
      </View>

      {/* Stock Card - per bag type */}
      <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: T.secondary, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="cube" size={22} color={T.secondary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: T.text }}>Bags in Stock</Text>
          <Text testID="total-stock" style={{ fontSize: 24, fontWeight: 'bold', color: T.secondary, marginLeft: 'auto' }}>{d?.total_stock || 0}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: T.muted }}>Naturoplast</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: T.primary }}>{d?.naturoplast_stock || 0}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: T.muted }}>Iraniya</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: T.warn }}>{d?.iraniya_stock || 0}</Text>
          </View>
        </View>
      </View>

      {/* Profit/Loss Card */}
      <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: (d?.profit_loss || 0) >= 0 ? T.ok : T.err, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase' }}>Profit / Loss</Text>
            <Text testID="profit-loss" style={{ fontSize: 28, fontWeight: 'bold', color: (d?.profit_loss || 0) >= 0 ? T.ok : T.err }}>
              {(d?.profit_loss || 0) >= 0 ? '+' : ''}{fmt(d?.profit_loss)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, color: T.ok }}>Income: {fmt(d?.total_income)}</Text>
            <Text style={{ fontSize: 12, color: T.err }}>Expense: {fmt(d?.total_expenses)}</Text>
          </View>
        </View>
      </View>

      {/* Balance Sheet Expandable */}
      <TouchableOpacity testID="toggle-reports" style={[s.card, { marginBottom: 4 }]} onPress={() => setShowReports(!showReports)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="bar-chart" size={22} color={T.primary} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: T.text }}>Balance Sheet & Reports</Text>
          </View>
          <Ionicons name={showReports ? 'chevron-up' : 'chevron-down'} size={22} color={T.muted} />
        </View>
      </TouchableOpacity>
      {showReports && (
        <View style={[s.card, { marginBottom: 16, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text, marginBottom: 12 }}>Assets</Text>
          <View style={s.bsRow}><Text style={s.bsLabel}>Bank Balance</Text><Text style={s.bsValue}>{fmt(d?.bank_balance)}</Text></View>
          <View style={s.bsRow}><Text style={s.bsLabel}>Petty Cash</Text><Text style={s.bsValue}>{fmt(d?.petty_cash_balance)}</Text></View>
          <View style={s.bsRow}><Text style={s.bsLabel}>Receivables</Text><Text style={s.bsValue}>{fmt(d?.total_receivables)}</Text></View>
          <View style={[s.bsRow, { borderTopWidth: 2, borderTopColor: T.primary, marginTop: 8, paddingTop: 8 }]}>
            <Text style={[s.bsLabel, { fontWeight: 'bold' }]}>Total Assets</Text>
            <Text style={[s.bsValue, { fontWeight: 'bold', color: T.primary }]}>{fmt((d?.bank_balance || 0) + (d?.petty_cash_balance || 0) + (d?.total_receivables || 0))}</Text>
          </View>

          <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text, marginBottom: 12, marginTop: 20 }}>Liabilities</Text>
          <View style={s.bsRow}><Text style={s.bsLabel}>Partner Balances</Text><Text style={s.bsValue}>{fmt(d?.total_partner_balance)}</Text></View>

          <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text, marginBottom: 12, marginTop: 20 }}>Monthly Breakdown</Text>
          {months.map(([month, vals]: any) => (
            <View key={month} style={{ marginBottom: 12, backgroundColor: T.bg, borderRadius: 8, padding: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: T.text, marginBottom: 6 }}>{month}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: T.ok }}>Income: {fmt(vals.income)}</Text>
                <Text style={{ fontSize: 12, color: T.err }}>Expense: {fmt(vals.expense)}</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: vals.income - vals.expense >= 0 ? T.ok : T.err }}>
                  {vals.income - vals.expense >= 0 ? '+' : ''}{fmt(vals.income - vals.expense)}
                </Text>
              </View>
            </View>
          ))}
          {months.length === 0 && <Text style={{ fontSize: 13, color: T.muted }}>No data yet</Text>}
        </View>
      )}

      {/* Bank Account Section */}
      <TouchableOpacity testID="toggle-bank" style={[s.card, { marginBottom: 4 }]} onPress={() => setShowBank(!showBank)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="business" size={22} color={T.secondary} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: T.text }}>Bank Account</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: T.secondary }}>{fmt(d?.bank_balance)}</Text>
            <Ionicons name={showBank ? 'chevron-up' : 'chevron-down'} size={22} color={T.muted} />
          </View>
        </View>
      </TouchableOpacity>
      {showBank && (
        <View style={[s.card, { marginBottom: 16, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: T.text, marginBottom: 12 }}>Bank Transactions</Text>
          {(d?.bank_transactions || []).slice(0, 20).map((t: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>{t.description || t.category || t.type}</Text>
                <Text style={{ fontSize: 11, color: T.muted }}>{typeof t.date === 'string' ? t.date.slice(0, 10) : ''}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: t.type === 'Income' ? T.ok : T.err }}>
                {t.type === 'Income' ? '+' : '-'}{fmt(t.amount)}
              </Text>
            </View>
          ))}
          {(!d?.bank_transactions || d.bank_transactions.length === 0) && <Text style={{ fontSize: 13, color: T.muted }}>No bank transactions yet</Text>}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg },
  content: { padding: 16 },
  card: { backgroundColor: T.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: T.text, marginTop: 6, marginBottom: 2 },
  statLbl: { fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  bsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  bsLabel: { fontSize: 14, color: T.muted },
  bsValue: { fontSize: 14, fontWeight: '600', color: T.text },
});
