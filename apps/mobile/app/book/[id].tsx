import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTherapist, useTherapistAvailability } from '@/hooks/useTherapists';
import { usePaymentMethods } from '@/hooks/usePayments';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { formatCurrencyFromCents, formatDate } from '@/utils/formatting';
import type { TimeSlot, PaymentMethod } from '@/types';

const DURATIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '60 min' },
  { minutes: 90, label: '90 min' },
];

export default function BookAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Queries
  const { data: therapist, isLoading: therapistLoading } = useTherapist(id!);
  const { data: availability, isLoading: availabilityLoading } = useTherapistAvailability(
    id!,
    selectedDate.toISOString().split('T')[0]
  );
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = usePaymentMethods();

  // Mutations
  const createAppointment = useCreateAppointment();

  // Calculate price based on duration
  const totalPrice = useMemo(() => {
    if (!therapist) return 0;
    // hourlyRate is in cents, so calculate proportionally
    return Math.round((therapist.hourlyRate / 60) * selectedDuration);
  }, [therapist, selectedDuration]);

  // Generate calendar dates (next 30 days)
  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Filter available slots based on duration
  const availableSlots = useMemo(() => {
    if (!availability?.slots) return [];
    const bookedTimes = new Set(
      availability.bookedSlots?.map((s) => s.startTime) || []
    );
    return availability.slots.filter((slot) => !bookedTimes.has(slot.startTime));
  }, [availability]);

  // Set default payment method
  useMemo(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedPaymentMethod) {
      const defaultMethod = paymentMethods.find((m) => m.isDefault);
      setSelectedPaymentMethod(defaultMethod?.id || paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPaymentMethod]);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Reset slot when date changes
  }, []);

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedPaymentMethod || !therapist) {
      Alert.alert(t('common.error'), t('booking.pleaseSelectAll'));
      return;
    }

    setShowConfirmation(true);
  };

  const handleFinalConfirm = async () => {
    if (!selectedSlot || !selectedPaymentMethod || !therapist) return;

    try {
      setBookingError(null);

      // Combine date and time
      const scheduledAt = new Date(selectedDate);
      const [hours, minutes] = selectedSlot.startTime.split(':').map(Number);
      scheduledAt.setHours(hours, minutes, 0, 0);

      await createAppointment.mutateAsync({
        therapistId: therapist.id,
        scheduledAt: scheduledAt.toISOString(),
        duration: selectedDuration,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        amount: totalPrice,
        bookingNotes: bookingNotes.trim() || undefined,
        paymentMethodId: selectedPaymentMethod,
      });

      setBookingSuccess(true);
    } catch (error: any) {
      setBookingError(error?.message || t('errors.general'));
    }
  };

  const handleDismissConfirmation = () => {
    if (bookingSuccess) {
      router.replace('/(tabs)/appointments');
    } else {
      setShowConfirmation(false);
      setBookingError(null);
    }
  };

  const isDateSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  if (therapistLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  if (!therapist) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('errors.notFound')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('booking.title')}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Therapist Info */}
        <View style={styles.therapistCard}>
          <View style={styles.therapistAvatar}>
            {therapist.user.avatarUrl ? (
              <View style={styles.avatarImage}>
                <Text style={styles.avatarText}>
                  {therapist.user.firstName?.[0]}
                  {therapist.user.lastName?.[0]}
                </Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {therapist.user.firstName?.[0]}
                  {therapist.user.lastName?.[0]}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.therapistInfo}>
            <Text style={styles.therapistName}>
              {therapist.user.firstName} {therapist.user.lastName}
            </Text>
            <Text style={styles.therapistTitle}>{therapist.professionalTitle}</Text>
            <Text style={styles.therapistRate}>
              {formatCurrencyFromCents(therapist.hourlyRate)}/hr
            </Text>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.selectDate')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
            contentContainerStyle={styles.dateScrollContent}
          >
            {calendarDates.map((date, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  isDateSelected(date) && styles.dateItemSelected,
                ]}
                onPress={() => handleDateSelect(date)}
              >
                <Text
                  style={[
                    styles.dateDayName,
                    isDateSelected(date) && styles.dateTextSelected,
                  ]}
                >
                  {isToday(date)
                    ? t('dates.today')
                    : date.toLocaleDateString('en', { weekday: 'short' })}
                </Text>
                <Text
                  style={[
                    styles.dateDay,
                    isDateSelected(date) && styles.dateTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                <Text
                  style={[
                    styles.dateMonth,
                    isDateSelected(date) && styles.dateTextSelected,
                  ]}
                >
                  {date.toLocaleDateString('en', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Slot Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.selectTime')}</Text>
          {availabilityLoading ? (
            <ActivityIndicator size="small" color="#4F46E5" style={styles.slotLoader} />
          ) : availableSlots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotItem,
                    selectedSlot?.startTime === slot.startTime && styles.slotItemSelected,
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      selectedSlot?.startTime === slot.startTime && styles.slotTextSelected,
                    ]}
                  >
                    {slot.startTime}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noSlotsText}>{t('booking.noAvailableSlots')}</Text>
          )}
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.sessionDuration')}</Text>
          <View style={styles.durationContainer}>
            {DURATIONS.map((duration) => (
              <TouchableOpacity
                key={duration.minutes}
                style={[
                  styles.durationItem,
                  selectedDuration === duration.minutes && styles.durationItemSelected,
                ]}
                onPress={() => setSelectedDuration(duration.minutes)}
              >
                <Text
                  style={[
                    styles.durationText,
                    selectedDuration === duration.minutes && styles.durationTextSelected,
                  ]}
                >
                  {duration.label}
                </Text>
                <Text
                  style={[
                    styles.durationPrice,
                    selectedDuration === duration.minutes && styles.durationTextSelected,
                  ]}
                >
                  {formatCurrencyFromCents(
                    Math.round((therapist.hourlyRate / 60) * duration.minutes)
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('booking.paymentMethod')}</Text>
            <TouchableOpacity onPress={() => Alert.alert(t('booking.addPaymentMethod'), 'Coming soon')}>
              <Text style={styles.addNewText}>{t('booking.addNew')}</Text>
            </TouchableOpacity>
          </View>
          {paymentMethodsLoading ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : paymentMethods && paymentMethods.length > 0 ? (
            <View style={styles.paymentMethodsContainer}>
              {paymentMethods.map((method: PaymentMethod) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodItem,
                    selectedPaymentMethod === method.id && styles.paymentMethodSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                >
                  <View style={styles.paymentMethodLeft}>
                    <Ionicons
                      name="card-outline"
                      size={24}
                      color={selectedPaymentMethod === method.id ? '#4F46E5' : '#6B7280'}
                    />
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodBrand}>
                        {method.brand?.toUpperCase()} •••• {method.last4}
                      </Text>
                      <Text style={styles.paymentMethodExpiry}>
                        {t('booking.expires')} {method.expiryMonth}/{method.expiryYear}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      selectedPaymentMethod === method.id && styles.radioOuterSelected,
                    ]}
                  >
                    {selectedPaymentMethod === method.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPaymentButton}
              onPress={() => Alert.alert(t('booking.addPaymentMethod'), 'Coming soon')}
            >
              <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
              <Text style={styles.addPaymentText}>{t('booking.addPaymentMethod')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Booking Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('booking.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('booking.notesPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={bookingNotes}
            onChangeText={setBookingNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('booking.sessionFee')}</Text>
            <Text style={styles.priceValue}>{formatCurrencyFromCents(totalPrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('booking.platformFee')}</Text>
            <Text style={styles.priceValue}>{formatCurrencyFromCents(0)}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceTotalLabel}>{t('booking.total')}</Text>
            <Text style={styles.priceTotalValue}>{formatCurrencyFromCents(totalPrice)}</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!selectedSlot || !selectedPaymentMethod) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={!selectedSlot || !selectedPaymentMethod}
        >
          <Text style={styles.confirmButtonText}>{t('booking.confirmBooking')}</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {createAppointment.isPending ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.processingText}>{t('booking.processing')}</Text>
              </View>
            ) : bookingSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>{t('booking.success')}</Text>
                <Text style={styles.successSubtitle}>{t('booking.successMessage')}</Text>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>{t('booking.bookingSummary')}</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.therapist')}</Text>
                    <Text style={styles.summaryValue}>
                      {therapist?.user.firstName} {therapist?.user.lastName}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.date')}</Text>
                    <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.time')}</Text>
                    <Text style={styles.summaryValue}>{selectedSlot?.startTime}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.duration')}</Text>
                    <Text style={styles.summaryValue}>{selectedDuration} min</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.price')}</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrencyFromCents(totalPrice)}
                    </Text>
                  </View>
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons name="time-outline" size={16} color="#F59E0B" />
                  <Text style={styles.statusText}>{t('booking.pendingApproval')}</Text>
                </View>

                <View style={styles.notificationInfo}>
                  <Ionicons name="mail-outline" size={16} color="#6B7280" />
                  <Text style={styles.notificationText}>{t('booking.emailSent')}</Text>
                </View>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleDismissConfirmation}
                >
                  <Text style={styles.doneButtonText}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.confirmContainer}>
                <Text style={styles.confirmTitle}>{t('booking.confirmTitle')}</Text>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.therapist')}</Text>
                    <Text style={styles.summaryValue}>
                      {therapist?.user.firstName} {therapist?.user.lastName}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.date')}</Text>
                    <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.time')}</Text>
                    <Text style={styles.summaryValue}>{selectedSlot?.startTime}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('booking.duration')}</Text>
                    <Text style={styles.summaryValue}>{selectedDuration} min</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotalLabel}>{t('booking.total')}</Text>
                    <Text style={styles.summaryTotalValue}>
                      {formatCurrencyFromCents(totalPrice)}
                    </Text>
                  </View>
                </View>

                {bookingError && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorBannerText}>{bookingError}</Text>
                  </View>
                )}

                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleDismissConfirmation}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={handleFinalConfirm}
                  >
                    <Text style={styles.payButtonText}>
                      {t('booking.payNow')} {formatCurrencyFromCents(totalPrice)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  therapistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  therapistAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4F46E5',
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  therapistTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  therapistRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  addNewText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  dateScroll: {
    marginHorizontal: -16,
  },
  dateScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dateItem: {
    width: 64,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  dateItemSelected: {
    backgroundColor: '#4F46E5',
  },
  dateDayName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  dateMonth: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  dateTextSelected: {
    color: '#fff',
  },
  slotLoader: {
    marginVertical: 20,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  slotItemSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  slotText: {
    fontSize: 14,
    color: '#374151',
  },
  slotTextSelected: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  durationItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationItemSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  durationPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  durationTextSelected: {
    color: '#4F46E5',
  },
  paymentMethodsContainer: {
    gap: 12,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    marginLeft: 12,
  },
  paymentMethodBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  paymentMethodExpiry: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#4F46E5',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addPaymentText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
    marginLeft: 8,
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceSummary: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    color: '#111827',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  priceTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  priceTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    marginLeft: 6,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  notificationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  doneButton: {
    width: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmContainer: {
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  payButton: {
    flex: 2,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
