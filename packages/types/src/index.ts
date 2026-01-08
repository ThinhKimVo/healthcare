// User types
export type UserRole = 'USER' | 'THERAPIST' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  timezone: string;
  preferredLanguage: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Therapist types
export type TherapistVerificationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type LanguageProficiency = 'NATIVE' | 'FLUENT' | 'CONVERSATIONAL';

export interface Therapist {
  id: string;
  userId: string;
  professionalTitle?: string;
  yearsOfExperience?: number;
  city?: string;
  state?: string;
  country?: string;
  verificationStatus: TherapistVerificationStatus;
  isOnline: boolean;
  hourlyRate?: number;
  perMinuteRate?: number;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
}

export interface TherapistLanguage {
  id: string;
  therapistId: string;
  language: string;
  proficiency: LanguageProficiency;
}

export interface Specialization {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

// Appointment types
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type AppointmentType = 'SCHEDULED' | 'INSTANT';

export interface Appointment {
  id: string;
  userId: string;
  therapistId: string;
  scheduledAt: Date;
  duration: number;
  timezone: string;
  type: AppointmentType;
  status: AppointmentStatus;
  amount: number;
  bookingNotes?: string;
  sessionNotes?: string;
  cancellationReason?: string;
  createdAt: Date;
}

// Payment types
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isVerified: boolean;
}

export interface Payment {
  id: string;
  userId: string;
  appointmentId?: string;
  amount: number;
  platformFee: number;
  therapistAmount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: Date;
  createdAt: Date;
}

// Review types
export interface Review {
  id: string;
  userId: string;
  therapistId: string;
  appointmentId: string;
  rating: number;
  feedback?: string;
  tags: string[];
  isAnonymous: boolean;
  createdAt: Date;
}

// Notification types
export type NotificationType =
  | 'BOOKING_CONFIRMATION'
  | 'APPOINTMENT_REMINDER'
  | 'PAYMENT_RECEIPT'
  | 'THERAPIST_MESSAGE'
  | 'MARKETING'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
