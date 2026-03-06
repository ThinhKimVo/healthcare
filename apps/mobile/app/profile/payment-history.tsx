import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePaymentHistory } from '@/hooks/usePayments';
import type { Payment } from '@/types';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: '#D97706', bg: '#FEF3C7' },
  SUCCESS: { label: 'Paid', color: '#059669', bg: '#D1FAE5' },
  FAILED: { label: 'Failed', color: '#DC2626', bg: '#FEE2E2' },
  REFUNDED: { label: 'Refunded', color: '#6B7280', bg: '#F3F4F6' },
};

function formatAmount(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PaymentItem({ payment }: { payment: Payment }) {
  const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
  const therapistName = payment.appointment?.therapist?.user
    ? `Dr. ${payment.appointment.therapist.user.firstName} ${payment.appointment.therapist.user.lastName}`
    : 'Therapy Session';

  return (
    <View style={styles.paymentItem}>
      <View style={styles.paymentLeft}>
        <View style={styles.paymentIcon}>
          <Ionicons
            name={payment.status === 'REFUNDED' ? 'arrow-undo' : 'card-outline'}
            size={20}
            color="#4F46E5"
          />
        </View>
      </View>
      <View style={styles.paymentMiddle}>
        <Text style={styles.paymentTitle}>{therapistName}</Text>
        <Text style={styles.paymentDate}>{formatDate(payment.createdAt)}</Text>
        {payment.appointment && (
          <Text style={styles.paymentMeta}>
            {payment.appointment.duration} min session
          </Text>
        )}
      </View>
      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>{formatAmount(payment.amount)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
    </View>
  );
}

export default function PaymentHistoryScreen() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = usePaymentHistory(page, 20);

  const payments = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const total = data?.meta?.total || 0;

  const totalPaid = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Payment History</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#4F46E5" />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            total > 0 ? (
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Transactions</Text>
                  <Text style={styles.summaryValue}>{total}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Paid</Text>
                  <Text style={[styles.summaryValue, { color: '#4F46E5' }]}>{formatAmount(totalPaid)}</Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => <PaymentItem payment={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptySubtitle}>Your payment history will appear here after your first session.</Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  <Ionicons name="chevron-back" size={18} color={page === 1 ? '#D1D5DB' : '#4F46E5'} />
                  <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isFetching}
                >
                  <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>Next</Text>
                  <Ionicons name="chevron-forward" size={18} color={page === totalPages ? '#D1D5DB' : '#4F46E5'} />
                </TouchableOpacity>
              </View>
            ) : null
          }
          contentContainerStyle={payments.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  summaryDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  listContent: { paddingBottom: 32 },
  emptyContainer: { flex: 1 },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  paymentLeft: { marginRight: 12 },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMiddle: { flex: 1 },
  paymentTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  paymentDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  paymentMeta: { fontSize: 12, color: '#6B7280' },
  paymentRight: { alignItems: 'flex-end', gap: 4 },
  paymentAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  pageBtnDisabled: { backgroundColor: '#F3F4F6' },
  pageBtnText: { fontSize: 14, fontWeight: '600', color: '#4F46E5' },
  pageBtnTextDisabled: { color: '#D1D5DB' },
  pageIndicator: { fontSize: 13, color: '#6B7280' },
});
