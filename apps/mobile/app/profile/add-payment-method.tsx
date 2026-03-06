import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useStripe,
  CardField,
  useApplePay,
  useGooglePay,
} from '@stripe/stripe-react-native';
import type { CardFieldInput } from '@stripe/stripe-react-native';
import { paymentsService } from '@/services/payments';
import { useQueryClient } from '@tanstack/react-query';

type TabType = 'card' | 'wallet';

export default function AddPaymentMethodScreen() {
  const { createPaymentMethod, confirmSetupIntent } = useStripe();
  const { isApplePaySupported, presentApplePay, confirmApplePayPayment } = useApplePay();
  const { isGooglePaySupported, initGooglePay, presentGooglePay } = useGooglePay();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('card');
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [saveConsent, setSaveConsent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Billing address state
  const [billingName, setBillingName] = useState('');
  const [billingLine1, setBillingLine1] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostal, setBillingPostal] = useState('');
  const [billingCountry, setBillingCountry] = useState('US');

  const isCardComplete = cardDetails?.complete ?? false;

  const handleAddCard = async () => {
    if (!isCardComplete) {
      Alert.alert('Incomplete Card', 'Please enter complete card details.');
      return;
    }
    if (!saveConsent) {
      Alert.alert('Consent Required', 'Please agree to save your card to continue.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get SetupIntent client secret from backend
      const { clientSecret } = await paymentsService.createSetupIntent();

      // 2. Confirm the setup intent with the card
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: billingName || undefined,
            address: {
              line1: billingLine1 || undefined,
              city: billingCity || undefined,
              postalCode: billingPostal || undefined,
              country: billingCountry || undefined,
            },
          },
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (!setupIntent?.paymentMethodId) {
        Alert.alert('Error', 'Failed to create payment method.');
        return;
      }

      // 3. Save payment method to our backend
      await paymentsService.addPaymentMethod({
        stripePaymentMethodId: setupIntent.paymentMethodId,
        type: 'card',
        brand: cardDetails?.brand,
        last4: cardDetails?.last4,
        expiryMonth: cardDetails?.expiryMonth,
        expiryYear: cardDetails?.expiryYear,
      });

      // 4. Invalidate and navigate back
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      Alert.alert('Success', 'Card added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplePay = async () => {
    if (!isApplePaySupported) {
      Alert.alert('Apple Pay', 'Apple Pay is not supported on this device.');
      return;
    }
    setIsLoading(true);
    try {
      const { clientSecret } = await paymentsService.createSetupIntent();
      const { error } = await presentApplePay({
        cartItems: [{ label: 'Save Payment Method', amount: '0.00', paymentType: 'Immediate' }],
        country: 'US',
        currency: 'USD',
      });
      if (error) {
        Alert.alert('Apple Pay', error.message);
        return;
      }
      const { error: confirmError } = await confirmApplePayPayment(clientSecret);
      if (confirmError) {
        Alert.alert('Apple Pay', confirmError.message);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      Alert.alert('Success', 'Apple Pay added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to add Apple Pay. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGooglePay = async () => {
    setIsLoading(true);
    try {
      const supported = await isGooglePaySupported({ testEnv: __DEV__ });
      if (!supported) {
        Alert.alert('Google Pay', 'Google Pay is not available on this device.');
        return;
      }
      await initGooglePay({
        testEnv: __DEV__,
        merchantName: 'Hopefull',
        countryCode: 'US',
      });
      const { clientSecret } = await paymentsService.createSetupIntent();
      const { error } = await presentGooglePay({
        clientSecret,
        forSetupIntent: true,
        currencyCode: 'USD',
      });
      if (error) {
        Alert.alert('Google Pay', error.message);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      Alert.alert('Success', 'Google Pay added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to add Google Pay. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'card' && styles.tabActive]}
            onPress={() => setActiveTab('card')}
          >
            <Ionicons name="card-outline" size={18} color={activeTab === 'card' ? '#4F46E5' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'card' && styles.tabTextActive]}>Card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'wallet' && styles.tabActive]}
            onPress={() => setActiveTab('wallet')}
          >
            <Ionicons name="wallet-outline" size={18} color={activeTab === 'wallet' ? '#4F46E5' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>Digital Wallet</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'card' && (
          <>
            {/* Card Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Card Details</Text>
              <View style={styles.cardFieldWrapper}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{ number: '4242 4242 4242 4242' }}
                  cardStyle={{
                    backgroundColor: '#FFFFFF',
                    textColor: '#111827',
                    placeholderColor: '#9CA3AF',
                    cursorColor: '#4F46E5',
                    fontSize: 16,
                  }}
                  style={styles.cardField}
                  onCardChange={setCardDetails}
                />
              </View>

              {/* Accepted cards */}
              <View style={styles.acceptedCards}>
                <Ionicons name="card" size={20} color="#1A1F71" />
                <Text style={styles.acceptedCardText}>Visa</Text>
                <Ionicons name="card" size={20} color="#EB001B" />
                <Text style={styles.acceptedCardText}>Mastercard</Text>
                <Ionicons name="card" size={20} color="#007BC1" />
                <Text style={styles.acceptedCardText}>Amex</Text>
              </View>
            </View>

            {/* Billing Address */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Billing Address (Optional)</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  value={billingName}
                  onChangeText={setBillingName}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Street address"
                  value={billingLine1}
                  onChangeText={setBillingLine1}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="City"
                    value={billingCity}
                    onChangeText={setBillingCity}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={[styles.input, styles.inputShort]}
                    placeholder="ZIP"
                    value={billingPostal}
                    onChangeText={setBillingPostal}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>

            {/* Save consent */}
            <View style={styles.consentRow}>
              <Switch
                value={saveConsent}
                onValueChange={setSaveConsent}
                trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                thumbColor={saveConsent ? '#4F46E5' : '#9CA3AF'}
              />
              <Text style={styles.consentText}>
                Save this card for future payments. Your card details are encrypted and stored securely.
              </Text>
            </View>

            {/* Verification notice */}
            <View style={styles.verifyNotice}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.verifyNoticeText}>
                A $0.01 authorization will be placed to verify your card and immediately refunded.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addBtn, (!isCardComplete || !saveConsent || isLoading) && styles.addBtnDisabled]}
              onPress={handleAddCard}
              disabled={!isCardComplete || !saveConsent || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>Add Card</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'wallet' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Digital Wallets</Text>
            <Text style={styles.walletSubtitle}>
              Connect your preferred digital wallet for faster, one-tap payments.
            </Text>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.walletBtn, styles.walletBtnApple]}
                onPress={handleApplePay}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={22} color="#fff" />
                    <Text style={styles.walletBtnTextLight}>Apple Pay</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={[styles.walletBtn, styles.walletBtnGoogle]}
                onPress={handleGooglePay}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <>
                    <Text style={styles.googleG}>G</Text>
                    <Text style={styles.walletBtnTextDark}>Google Pay</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {Platform.OS !== 'ios' && Platform.OS !== 'android' && (
              <View style={styles.walletUnsupported}>
                <Ionicons name="information-circle-outline" size={24} color="#9CA3AF" />
                <Text style={styles.walletUnsupportedText}>
                  Digital wallets are only available on iOS and Android devices.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.secureFooter}>
          <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
          <Text style={styles.secureText}>Payments secured by Stripe · PCI DSS compliant</Text>
        </View>
      </ScrollView>
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
  tabRow: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#4F46E5', fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  cardFieldWrapper: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardField: { height: 52, paddingHorizontal: 12 },
  acceptedCards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptedCardText: { fontSize: 12, color: '#6B7280', marginRight: 4 },
  inputGroup: { gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputFlex: { flex: 1 },
  inputShort: { width: 100 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  consentText: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 18 },
  verifyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifyNoticeText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 16 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    marginBottom: 16,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  walletSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  walletBtnApple: { backgroundColor: '#000' },
  walletBtnGoogle: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  walletBtnTextLight: { fontSize: 16, fontWeight: '600', color: '#fff' },
  walletBtnTextDark: { fontSize: 16, fontWeight: '600', color: '#111827' },
  googleG: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  walletUnsupported: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  walletUnsupportedText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  secureText: { fontSize: 12, color: '#9CA3AF' },
});
