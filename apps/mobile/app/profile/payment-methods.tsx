import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  usePaymentMethods,
  useDeletePaymentMethod,
  useSetDefaultPaymentMethod,
  useVerifyCard,
} from '@/hooks/usePayments';
import type { PaymentMethod } from '@/types';

const BRAND_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  visa: { name: 'card', color: '#1A1F71' },
  mastercard: { name: 'card', color: '#EB001B' },
  amex: { name: 'card', color: '#007BC1' },
  discover: { name: 'card', color: '#FF6B00' },
};

function getBrandIcon(brand?: string) {
  const key = brand?.toLowerCase() || '';
  return BRAND_ICONS[key] || { name: 'card-outline' as const, color: '#6B7280' };
}

function CardBrandIcon({ brand, size = 24 }: { brand?: string; size?: number }) {
  const { name, color } = getBrandIcon(brand);
  return <Ionicons name={name} size={size} color={color} />;
}

function CardBrandLabel({ brand }: { brand?: string }) {
  const map: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
  };
  return map[brand?.toLowerCase() || ''] || brand || 'Card';
}

interface CardItemProps {
  card: PaymentMethod;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onVerify: (id: string) => void;
  isDeleting: boolean;
  isSettingDefault: boolean;
  isVerifying: boolean;
}

function CardItem({ card, onDelete, onSetDefault, onVerify, isDeleting, isSettingDefault, isVerifying }: CardItemProps) {
  const expiry = card.expiryMonth && card.expiryYear
    ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`
    : null;

  return (
    <View style={styles.cardItem}>
      <View style={styles.cardLeft}>
        <CardBrandIcon brand={card.brand} size={32} />
      </View>
      <View style={styles.cardMiddle}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardBrand}><CardBrandLabel brand={card.brand} /></Text>
          {card.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
          {!card.isVerified && (
            <View style={styles.unverifiedBadge}>
              <Text style={styles.unverifiedBadgeText}>Unverified</Text>
            </View>
          )}
          {card.isVerified && !card.isDefault && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardNumber}>•••• •••• •••• {card.last4 || '****'}</Text>
        {expiry && <Text style={styles.cardExpiry}>Expires {expiry}</Text>}
      </View>
      <View style={styles.cardActions}>
        {!card.isDefault && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onSetDefault(card.id)}
            disabled={isSettingDefault}
          >
            {isSettingDefault ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Ionicons name="star-outline" size={20} color="#4F46E5" />
            )}
          </TouchableOpacity>
        )}
        {!card.isVerified && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onVerify(card.id)}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onDelete(card.id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PaymentMethodsScreen() {
  const { data: cards = [], isLoading } = usePaymentMethods();
  const { mutate: deleteCard, isPending: isDeleting } = useDeletePaymentMethod();
  const { mutate: setDefault, isPending: isSettingDefault } = useSetDefaultPaymentMethod();
  const { mutate: verifyCard, isPending: isVerifying } = useVerifyCard();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeletePress = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!pendingDeleteId) return;
    setShowDeleteModal(false);
    deleteCard(pendingDeleteId, {
      onError: () => Alert.alert('Error', 'Failed to delete card. Please try again.'),
    });
    setPendingDeleteId(null);
  };

  const handleSetDefault = (id: string) => {
    setDefault(id, {
      onError: () => Alert.alert('Error', 'Failed to update default card.'),
    });
  };

  const handleVerify = (id: string) => {
    Alert.alert(
      'Verify Card',
      'We\'ll charge $0.01 to verify this card, then immediately refund it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: () =>
            verifyCard(id, {
              onSuccess: (res) => {
                if (res.verified) {
                  Alert.alert('Verified', 'Your card has been verified successfully.');
                } else {
                  Alert.alert('Failed', 'Card verification failed. Please check your card details.');
                }
              },
              onError: () => Alert.alert('Error', 'Verification failed. Please try again.'),
            }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#4F46E5" />
        ) : cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No payment methods</Text>
            <Text style={styles.emptySubtitle}>Add a card to pay for your sessions</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            <Text style={styles.sectionLabel}>Saved Cards</Text>
            {cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onDelete={handleDeletePress}
                onSetDefault={handleSetDefault}
                onVerify={handleVerify}
                isDeleting={isDeleting && pendingDeleteId === card.id}
                isSettingDefault={isSettingDefault}
                isVerifying={isVerifying}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/profile/add-payment-method')}
        >
          <Ionicons name="add-circle-outline" size={20} color="#4F46E5" />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </TouchableOpacity>

        <Text style={styles.secureNote}>
          <Ionicons name="lock-closed-outline" size={12} color="#9CA3AF" /> Secured by Stripe
        </Text>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrapper}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Remove Card</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to remove this card? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowDeleteModal(false); setPendingDeleteId(null); }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnDelete]} onPress={handleDeleteConfirm}>
                <Text style={styles.modalBtnDeleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  content: { flex: 1 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  cardList: { paddingBottom: 8 },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: { marginRight: 14 },
  cardMiddle: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardBrand: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardNumber: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
  cardExpiry: { fontSize: 12, color: '#9CA3AF' },
  defaultBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: '600', color: '#4F46E5' },
  unverifiedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unverifiedBadgeText: { fontSize: 11, fontWeight: '600', color: '#D97706' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderStyle: 'dashed',
    backgroundColor: '#F5F3FF',
  },
  addButtonText: { fontSize: 15, fontWeight: '600', color: '#4F46E5' },
  secureNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    paddingBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  modalBtnDelete: { backgroundColor: '#EF4444' },
  modalBtnDeleteText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
