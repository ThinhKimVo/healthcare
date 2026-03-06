import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppointment } from '@/hooks/useAppointments';
import { Avatar, Card } from '@/components/ui';
import { formatCurrencyFromCents } from '@/utils/formatting';

export default function SessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const { data: appointment, isLoading } = useAppointment(id!);

  const handleShare = async () => {
    if (!appointment) return;

    const therapistName = `${appointment.therapist?.user.firstName} ${appointment.therapist?.user.lastName}`;
    const date = new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const time = new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const amount = formatCurrencyFromCents(appointment.amount);

    const message = [
      'Session Summary',
      '─────────────────',
      `Therapist: Dr. ${therapistName}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Duration: ${appointment.duration} minutes`,
      `Amount Paid: ${amount}`,
      appointment.sessionNotes ? `\nSession Notes:\n${appointment.sessionNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ message });
    } catch (error) {
      // User cancelled or error - ignore
    }
  };

  const handleBookNext = () => {
    if (!appointment?.therapist?.id) return;
    router.push(`/book/${appointment.therapist.id}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('errors.notFound')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const therapistName = `${appointment.therapist?.user.firstName} ${appointment.therapist?.user.lastName}`;
  const platformFee = Math.round(appointment.amount * 0.2);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appointments.summary.title')}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
          <Ionicons name="share-outline" size={22} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Session Completed</Text>
          <Text style={styles.successSubtitle}>
            Great job taking care of your mental health!
          </Text>
        </View>

        {/* Therapist Info */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionLabel}>{t('appointments.summary.therapist')}</Text>
          <View style={styles.therapistRow}>
            <Avatar
              source={appointment.therapist?.user.avatarUrl}
              name={therapistName}
              size="lg"
            />
            <View style={styles.therapistInfo}>
              <Text style={styles.therapistName}>Dr. {therapistName}</Text>
              <Text style={styles.therapistTitle}>
                {appointment.therapist?.professionalTitle || 'Therapist'}
              </Text>
              {appointment.therapist?.averageRating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {appointment.therapist.averageRating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Session Details */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionLabel}>Session Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('appointments.summary.date')}</Text>
              <Text style={styles.detailValue}>
                {new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('appointments.summary.time')}</Text>
              <Text style={styles.detailValue}>
                {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="hourglass-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('appointments.summary.duration')}</Text>
              <Text style={styles.detailValue}>{appointment.duration} minutes</Text>
            </View>
          </View>
        </Card>

        {/* Session Notes */}
        {appointment.sessionNotes && (
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.sectionLabel}>{t('appointments.summary.sessionNotes')}</Text>
            <Text style={styles.notesText}>{appointment.sessionNotes}</Text>
          </Card>
        )}

        {/* Invoice */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionLabel}>{t('appointments.summary.amountPaid')}</Text>

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Session fee</Text>
            <Text style={styles.invoiceValue}>{formatCurrencyFromCents(appointment.amount)}</Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Platform fee</Text>
            <Text style={styles.invoiceValue}>{formatCurrencyFromCents(platformFee)}</Text>
          </View>

          <View style={styles.invoiceDivider} />

          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceTotalLabel}>Total paid</Text>
            <Text style={styles.invoiceTotalValue}>
              {formatCurrencyFromCents(appointment.amount)}
            </Text>
          </View>

          <TouchableOpacity style={styles.shareReceiptButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#4F46E5" />
            <Text style={styles.shareReceiptText}>{t('appointments.summary.share')}</Text>
          </TouchableOpacity>
        </Card>

        {/* Review Section (if reviewed) */}
        {appointment.review && (
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.sectionLabel}>Your Feedback</Text>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= appointment.review!.rating ? 'star' : 'star-outline'}
                  size={22}
                  color="#F59E0B"
                />
              ))}
            </View>
            {appointment.review.feedback && (
              <Text style={styles.reviewText}>{appointment.review.feedback}</Text>
            )}
          </Card>
        )}

      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.bookNextButton} onPress={handleBookNext}>
          <Ionicons name="calendar" size={20} color="#FFFFFF" />
          <Text style={styles.bookNextText}>{t('appointments.summary.bookNextSession')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.appointmentsButton}
          onPress={() => router.replace('/(tabs)/appointments')}
        >
          <Text style={styles.appointmentsButtonText}>View All Appointments</Text>
        </TouchableOpacity>
      </View>
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
  successBanner: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  therapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  therapistTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  invoiceValue: {
    fontSize: 14,
    color: '#111827',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  invoiceTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  shareReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  shareReceiptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  bookNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  bookNextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  appointmentsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});
