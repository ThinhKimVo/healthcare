import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTherapist, useTherapistReviews, useTherapistAvailability, useTherapistAvailabilitySummary } from '@/hooks';
import { Avatar, Badge, Rating, Card, Button, EmptyState } from '@/components/ui';
import { Calendar } from '@/components/calendar';

const { width } = Dimensions.get('window');

export default function TherapistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'about' | 'availability' | 'reviews'>('about');

  // Calendar state
  const today = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const currentMonth = useMemo(() => {
    return `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
  }, [calendarMonth, calendarYear]);

  const { data: therapist, isLoading } = useTherapist(id || '');
  const { data: reviewsData, isLoading: reviewsLoading } = useTherapistReviews(
    id || '',
    1,
    10
  );

  const { data: availabilitySummary, isLoading: availabilitySummaryLoading } =
    useTherapistAvailabilitySummary(id || '', currentMonth);

  const { data: dayAvailability, isLoading: dayAvailabilityLoading } =
    useTherapistAvailability(id || '', selectedDate || '');

  // Get user timezone
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }, []);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
    setSelectedDate(null);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleSlotPress = (startTime: string) => {
    if (selectedDate) {
      router.push({
        pathname: '/book/[id]',
        params: { id, date: selectedDate, time: startTime },
      } as any);
    }
  };

  if (isLoading || !therapist) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const handleBookAppointment = () => {
    router.push(`/book/${id}`);
  };

  const handleTalkNow = () => {
    router.push(`/instant-call/${id}`);
  };

  const renderAbout = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bioText}>
          {therapist.bio || 'No bio available'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specializations</Text>
        <View style={styles.badgesContainer}>
          {therapist.specializations.map((spec, index) => (
            <Badge
              key={index}
              label={spec.specialization.name}
              variant="primary"
              size="md"
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Languages</Text>
        <View style={styles.badgesContainer}>
          {therapist.languages.map((lang, index) => (
            <View key={index} style={styles.languageItem}>
              <Text style={styles.languageText}>{lang.language}</Text>
              <Text style={styles.proficiencyText}>({lang.proficiency})</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.locationText}>
            {[therapist.city, therapist.state, therapist.country]
              .filter(Boolean)
              .join(', ')}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience</Text>
        <Text style={styles.experienceText}>
          {therapist.yearsOfExperience} years of experience
        </Text>
      </View>
    </View>
  );

  const renderAvailability = () => (
    <View style={styles.tabContent}>
      <View style={styles.timezoneBanner}>
        <Ionicons name="time-outline" size={16} color="#6B7280" />
        <Text style={styles.timezoneText}>
          Times shown in your timezone ({userTimezone})
        </Text>
      </View>

      {availabilitySummaryLoading ? (
        <View style={styles.calendarLoading}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <Calendar
          month={calendarMonth}
          year={calendarYear}
          selectedDate={selectedDate}
          availabilityData={availabilitySummary?.dates || []}
          onDateSelect={handleDateSelect}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      )}

      {selectedDate && (
        <View style={styles.slotsSection}>
          <Text style={styles.slotsTitle}>
            Available Times for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          {dayAvailabilityLoading ? (
            <ActivityIndicator size="small" color="#4F46E5" style={styles.slotsLoading} />
          ) : dayAvailability?.slots && dayAvailability.slots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {dayAvailability.slots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.slotButton}
                  onPress={() => handleSlotPress(slot.startTime)}
                >
                  <Text style={styles.slotText}>{slot.startTime}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noSlotsContainer}>
              <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            </View>
          )}
        </View>
      )}

      {!selectedDate && (
        <View style={styles.selectDateHint}>
          <Ionicons name="hand-left-outline" size={24} color="#9CA3AF" />
          <Text style={styles.selectDateText}>Select a date to see available times</Text>
        </View>
      )}
    </View>
  );

  const renderReviews = () => (
    <View style={styles.tabContent}>
      <View style={styles.reviewsSummary}>
        <View style={styles.ratingLarge}>
          <Text style={styles.ratingNumber}>{therapist.averageRating.toFixed(1)}</Text>
          <Rating value={therapist.averageRating} size={24} />
          <Text style={styles.reviewCount}>
            {therapist.totalReviews} reviews
          </Text>
        </View>
      </View>

      {reviewsLoading ? (
        <ActivityIndicator size="small" color="#4F46E5" />
      ) : reviewsData?.data.length === 0 ? (
        <EmptyState
          icon="chatbubble-outline"
          title="No reviews yet"
          description="Be the first to leave a review after your session"
        />
      ) : (
        reviewsData?.data.map((review) => (
          <Card key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Avatar
                source={review.isAnonymous ? null : review.user?.avatarUrl}
                name={review.isAnonymous ? 'Anonymous' : `${review.user?.firstName}`}
                size="sm"
              />
              <View style={styles.reviewInfo}>
                <Text style={styles.reviewerName}>
                  {review.isAnonymous ? 'Anonymous' : review.user?.firstName}
                </Text>
                <Rating value={review.rating} size={12} />
              </View>
              <Text style={styles.reviewDate}>
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {review.feedback && (
              <Text style={styles.reviewText}>{review.feedback}</Text>
            )}
            {review.tags && review.tags.length > 0 && (
              <View style={styles.reviewTags}>
                {review.tags.map((tag, index) => (
                  <Badge key={index} label={tag} variant="default" size="sm" />
                ))}
              </View>
            )}
          </Card>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHeader}>
          <Avatar
            source={therapist.user.avatarUrl}
            name={`${therapist.user.firstName} ${therapist.user.lastName}`}
            size="xl"
            showOnlineStatus
            isOnline={therapist.isOnline}
          />
          <Text style={styles.therapistName}>
            {therapist.user.firstName} {therapist.user.lastName}
          </Text>
          <Text style={styles.therapistTitle}>{therapist.professionalTitle}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{therapist.averageRating.toFixed(1)}</Text>
              <View style={styles.statLabel}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={styles.statLabelText}>Rating</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{therapist.totalReviews}</Text>
              <Text style={styles.statLabelText}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{therapist.totalBookings}</Text>
              <Text style={styles.statLabelText}>Sessions</Text>
            </View>
          </View>
        </View>

        <View style={styles.pricingCard}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Hourly Rate</Text>
              <Text style={styles.priceValue}>
                ${(therapist.hourlyRate / 100).toFixed(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.priceLabel}>Per Minute</Text>
              <Text style={styles.priceValue}>
                ${(therapist.perMinuteRate / 100).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.tabActive]}
            onPress={() => setActiveTab('about')}
          >
            <Text
              style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}
            >
              About
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'availability' && styles.tabActive]}
            onPress={() => setActiveTab('availability')}
          >
            <Text
              style={[styles.tabText, activeTab === 'availability' && styles.tabTextActive]}
            >
              Availability
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text
              style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}
            >
              Reviews ({therapist.totalReviews})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'about' && renderAbout()}
        {activeTab === 'availability' && renderAvailability()}
        {activeTab === 'reviews' && renderReviews()}
      </ScrollView>

      <View style={styles.footer}>
        {therapist.isOnline && (
          <Button
            title="Talk Now"
            onPress={handleTalkNow}
            variant="secondary"
            icon={<Ionicons name="flash" size={18} color="#4F46E5" />}
            style={styles.talkNowButton}
          />
        )}
        <Button
          title="Book Appointment"
          onPress={handleBookAppointment}
          style={styles.bookButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  therapistName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  therapistTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabelText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  pricingCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4F46E5',
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  languageText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  proficiencyText: {
    fontSize: 12,
    color: '#6B7280',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 15,
    color: '#374151',
  },
  experienceText: {
    fontSize: 15,
    color: '#374151',
  },
  reviewsSummary: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  ratingLarge: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827',
  },
  reviewCount: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  reviewCard: {
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  talkNowButton: {
    flex: 1,
  },
  bookButton: {
    flex: 2,
  },
  // Availability tab styles
  timezoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  timezoneText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  calendarLoading: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsSection: {
    marginTop: 24,
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  slotsLoading: {
    marginVertical: 24,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  slotText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noSlotsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectDateHint: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  selectDateText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
