import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAddReview } from '@/hooks/useAppointments';
import { Avatar } from '@/components/ui';

interface RateSessionModalProps {
  visible: boolean;
  appointmentId: string | null;
  therapistName?: string;
  therapistAvatar?: string | null;
  onClose: () => void;
}

const RATING_LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

export function RateSessionModal({
  visible,
  appointmentId,
  therapistName,
  therapistAvatar,
  onClose,
}: RateSessionModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const addReview = useAddReview();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const starScales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
      setSubmitted(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      slideAnim.setValue(400);
      successScale.setValue(0);
    }
  }, [visible]);

  const handleStarPress = useCallback(
    (starValue: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRating(starValue);

      // Bounce animation on selected star
      Animated.sequence([
        Animated.spring(starScales[starValue - 1], {
          toValue: 1.4,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.spring(starScales[starValue - 1], {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
        }),
      ]).start();

      // Reset all other stars
      starScales.forEach((scale, idx) => {
        if (idx !== starValue - 1) {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
      });
    },
    [starScales]
  );

  const handleSubmit = async () => {
    if (!appointmentId || rating === 0) return;

    try {
      await addReview.mutateAsync({
        id: appointmentId,
        reviewData: {
          rating,
          feedback: comment.trim() || undefined,
        },
      });

      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate success icon
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 60,
      }).start();

      setTimeout(onClose, 2000);
    } catch {
      // If review submission fails (e.g., already reviewed), just close
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handleBar} />

          {submitted ? (
            <View style={styles.thankYouContainer}>
              <Animated.View
                style={[styles.thankYouIcon, { transform: [{ scale: successScale }] }]}
              >
                <Ionicons name="heart" size={48} color="#4F46E5" />
              </Animated.View>
              <Text style={styles.thankYouTitle}>Thank You!</Text>
              <Text style={styles.thankYouText}>
                Your feedback helps improve the experience for everyone.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>How was your session?</Text>

              {therapistName && (
                <View style={styles.therapistRow}>
                  <Avatar source={therapistAvatar} name={therapistName} size="sm" />
                  <Text style={styles.therapistName}>with {therapistName}</Text>
                </View>
              )}

              {/* Star Rating */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleStarPress(star)}
                    activeOpacity={0.8}
                    style={styles.starButton}
                  >
                    <Animated.View style={{ transform: [{ scale: starScales[star - 1] }] }}>
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={44}
                        color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                ))}
              </View>

              {rating > 0 && (
                <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
              )}

              {/* Optional Comment */}
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment (optional)"
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={1000}
              />
              {comment.length > 800 && (
                <Text style={styles.charCount}>{comment.length}/1000</Text>
              )}

              {/* Actions */}
              <View style={styles.buttons}>
                <TouchableOpacity style={styles.skipButton} onPress={onClose}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (rating === 0 || addReview.isPending) && styles.submitDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={rating === 0 || addReview.isPending}
                >
                  {addReview.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.bottomSpacer} />
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  therapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  therapistName: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 20,
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
  },
  submitDisabled: {
    backgroundColor: '#A5B4FC',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  thankYouContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 48,
  },
  thankYouIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  thankYouTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  thankYouText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 32 : 16,
  },
});
