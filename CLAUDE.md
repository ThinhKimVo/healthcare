# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (uses pnpm workspaces)
pnpm install

# Start all apps in dev mode
pnpm dev

# Start individual apps
pnpm api:dev      # Backend API on http://localhost:3001
pnpm admin:dev    # Admin panel on http://localhost:3000
pnpm mobile:dev   # Mobile app with Expo

# Build all apps
pnpm build

# Lint all apps
pnpm lint
```

## Database Commands

```bash
pnpm db:generate  # Generate Prisma client after schema changes
pnpm db:push      # Push schema to database (dev)
pnpm db:migrate   # Create and run migrations
pnpm db:studio    # Open Prisma Studio GUI
```

## Testing

```bash
# Run tests (via Turborepo)
pnpm test

# API-specific testing
cd apps/api
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:cov          # Coverage report
```

## Architecture Overview

This is a **pnpm monorepo** managed by **Turborepo** with four apps and shared packages.

### Apps

| App | Tech Stack | Port | Package Name |
|-----|------------|------|--------------|
| `apps/api` | NestJS, Prisma, PostgreSQL | 3001 | @hopefull/api |
| `apps/mobile` | React Native, Expo | - | @hopefull/mobile |

### Shared Packages

- `packages/types` - TypeScript types shared across apps

### Backend Structure (NestJS)

The API follows NestJS module pattern:
- `src/auth/` - JWT authentication, local/social strategies, guards, OTP verification
- `src/users/` - User CRUD and profile management
- `src/therapists/` - Therapist discovery, availability, reviews
- `src/appointments/` - Booking, scheduling, cancellation
- `src/payments/` - Payment methods, transactions, Stripe integration
- `src/notifications/` - Push notifications via FCM, device token management, in-app notifications
- `src/reminders/` - Cron-based appointment reminders (24H, 1H, 15MIN before session)
- `src/prisma/` - Global Prisma service for database access
- `src/firebase/` - Firebase Admin SDK for phone verification, FCM push notifications, Firestore for avatar storage

Key patterns:
- Global `PrismaModule` provides database access to all modules
- `JwtAuthGuard` protects authenticated routes
- `RolesGuard` with `@Roles()` decorator for role-based access
- DTOs use `class-validator` decorators for validation
- Swagger decorators on controllers generate API docs at `/api/docs`

#### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register new user, sends 6-digit OTP |
| `/api/v1/auth/login` | POST | Login with email/password |
| `/api/v1/auth/social` | POST | Social login (Google/Apple), auto-creates or links account |
| `/api/v1/auth/verify-otp` | POST | Verify 6-digit OTP code |
| `/api/v1/auth/resend-otp` | POST | Resend OTP to user |
| `/api/v1/auth/verify-phone` | POST | Verify phone via Firebase ID token |
| `/api/v1/auth/verify-email` | POST | Verify email via Firebase ID token |
| `/api/v1/auth/forgot-password` | POST | Send password reset OTP to email |
| `/api/v1/auth/reset-password` | POST | Reset password with OTP |
| `/api/v1/auth/change-password` | POST | Change password (requires auth) |
| `/api/v1/auth/refresh` | POST | Refresh access token |
| `/api/v1/auth/me` | GET | Get current user profile |

#### User Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/users/profile` | GET | Get current user profile |
| `/api/v1/users/profile` | PATCH | Update profile (name, bio, timezone, etc.) |
| `/api/v1/users/profile/avatar` | POST | Upload avatar image (base64, stored in Firestore) |
| `/api/v1/users/profile/avatar` | DELETE | Remove avatar image |
| `/api/v1/users/:id` | GET | Get user by ID |

#### Therapist Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/therapists` | GET | List all verified therapists (with filters) |
| `/api/v1/therapists/me` | GET | Get current therapist profile (auth required) |
| `/api/v1/therapists/instant-call/available` | GET | Get available therapists for instant call, sorted by match score (auth required) |
| `/api/v1/therapists/:id` | GET | Get therapist by ID |
| `/api/v1/therapists/:id/availability` | GET | Get available time slots for a date |
| `/api/v1/therapists/:id/availability/summary` | GET | Get monthly availability summary for calendar view |
| `/api/v1/therapists/:id/reviews` | GET | Get therapist reviews (paginated) |
| `/api/v1/therapists/me/status` | PATCH | Update online/offline status (therapist only) |

#### Notification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/notifications` | GET | Get paginated notifications |
| `/api/v1/notifications/unread-count` | GET | Get unread notification count |
| `/api/v1/notifications/:id/read` | PATCH | Mark notification as read |
| `/api/v1/notifications/mark-all-read` | POST | Mark all notifications as read |
| `/api/v1/notifications/:id` | DELETE | Delete a notification |
| `/api/v1/notifications/device-token` | POST | Register FCM device token |
| `/api/v1/notifications/device-token` | DELETE | Remove FCM device token |
| `/api/v1/notifications/chat-message` | POST | Send push notification for chat message (no DB record) |
| `/api/v1/notifications/test/booking-confirmation` | POST | Send test booking notification |

#### Appointment Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/appointments` | POST | Create a new appointment |
| `/api/v1/appointments` | GET | Get user appointments (query: status=upcoming\|past) |
| `/api/v1/appointments/therapist` | GET | Get therapist appointments |
| `/api/v1/appointments/all` | GET | List all appointments (admin only) |
| `/api/v1/appointments/:id` | GET | Get appointment by ID |
| `/api/v1/appointments/:id/confirm` | PATCH | Confirm appointment (therapist) |
| `/api/v1/appointments/:id/decline` | PATCH | Decline appointment (therapist) |
| `/api/v1/appointments/:id/cancel` | PATCH | Cancel appointment (patient) |
| `/api/v1/appointments/:id/therapist-cancel` | PATCH | Cancel appointment (therapist) |
| `/api/v1/appointments/:id/complete` | PATCH | Complete appointment (therapist) |
| `/api/v1/appointments/:id/review` | POST | Add review for appointment |
| `/api/v1/appointments/:id/test-reminder` | POST | DEV: Send reminder notification immediately |

### Mobile Structure (Expo Router)

File-based routing with Expo Router:
- `app/_layout.tsx` - Root layout with providers, top-level push notification handlers
- `app/index.tsx` - Welcome/landing screen
- `app/onboarding.tsx` - Onboarding carousel
- `app/auth/` - Login, register, OTP verification, forgot password, biometric setup flows
- `app/(tabs)/` - Main app tabs (Home, Appointments, Therapists, Profile)
- `app/profile/` - Profile editing, settings, security screens
- `app/therapist/` - Therapist detail (with About/Availability/Reviews tabs) and booking screens
- `app/chat/[appointmentId].tsx` - Chat screen with push notification suppression
- `app/notifications/` - Notification list with tap-to-navigate
- `app/instant-call/` - Instant call search and outgoing call screens
- `app/incoming-call.tsx` - Incoming call screen for therapists
- `app/session/` - Video call session screen

State management:
- `src/store/auth.ts` - Zustand store for auth state, biometric settings, and onboarding
- `src/services/api.ts` - Axios instance with token interceptors and refresh logic
- `src/services/auth.ts` - Authentication service (login, register, password management)
- `src/services/social-auth.ts` - Google and Apple Sign-In via Firebase
- `src/services/biometric.ts` - Biometric authentication (Face ID, Touch ID, Fingerprint)
- `src/services/image-picker.ts` - Camera/gallery image picker with crop/resize
- `src/services/users.ts` - User profile and avatar management
- `src/services/push-notifications.ts` - FCM token management, foreground notification display via notifee
- `src/services/notifications.ts` - Notification API service (CRUD, device token registration)
- `src/config/firebase.ts` - Firebase client SDK configuration
- Tokens stored in `expo-secure-store`
- Onboarding flag stored in `AsyncStorage` (SecureStore unreliable on Android)

#### Registration Flow
1. User fills registration form (2 steps: personal info → password)
2. API creates user and generates 6-digit OTP (logged to console in dev)
3. Mobile navigates to OTP screen with Firebase Phone Auth
4. Firebase sends SMS via reCAPTCHA verification
5. User enters OTP, Firebase verifies, returns ID token
6. Mobile calls `/auth/verify-phone` with ID token
7. API verifies token, links phone to user, returns JWT tokens

#### Social Authentication Flow (Google/Apple)
1. User taps "Continue with Google" or "Continue with Apple" button
2. Mobile triggers native SDK authentication flow
3. On success, Firebase returns an ID token
4. Mobile calls `POST /auth/social` with `{ idToken, provider: 'GOOGLE' | 'APPLE' }`
5. API verifies token with Firebase Admin SDK
6. If email exists, links social account to existing user
7. If new email, creates new user with social account linked
8. API returns JWT tokens (accessToken, refreshToken)

Required packages:
- `@react-native-google-signin/google-signin` - Google Sign-In SDK
- `expo-apple-authentication` - Apple Sign-In (iOS only)
- `@react-native-firebase/auth` - Firebase Auth for token management

#### Biometric Authentication Flow
1. After successful login, user is prompted to enable biometrics
2. If enabled, credentials are securely stored in device keychain
3. On next app launch, user can authenticate with Face ID/Touch ID/Fingerprint
4. Biometric auth retrieves stored credentials and performs silent login
5. Falls back to manual login if biometrics fail or are unavailable

Key files:
- `src/services/biometric.ts` - Biometric availability check, credential storage
- `src/store/auth.ts` - `biometricEnabled` and `biometricEmail` state
- `app/auth/biometric-setup.tsx` - Post-login biometric enrollment screen

#### Password Management
- **Forgot Password**: Sends OTP to email → verify OTP → set new password
- **Change Password**: Requires current password → validates → updates password
- **Security**: After password change, user is logged out and must re-login

#### Profile Photo Upload
1. User taps avatar on profile edit screen
2. Image picker shows options: Camera or Photo Library
3. Selected image is cropped (1:1 aspect), resized (400x400), compressed (quality 0.7)
4. Image is converted to base64 and sent to `POST /users/profile/avatar`
5. API stores image as data URL in Firebase Firestore (`avatars` collection)
6. User's `avatarUrl` field is updated with the data URL
7. Avatar displays directly from data URL (no separate CDN needed)

Limitations:
- Max avatar size: 500KB after compression (Firestore document limit)
- Supported formats: JPG, PNG, HEIC (converted to JPEG)

#### Therapist Availability Calendar
The therapist detail screen includes an "Availability" tab with a monthly calendar view:
1. Calendar shows green dots for dates with available slots, gray for unavailable
2. User selects a date to see available time slots
3. Tapping a time slot navigates to booking with pre-filled date/time
4. Month navigation with prev/next arrows (past months disabled)
5. Timezone banner shows times in user's local timezone

Key files:
- `src/components/calendar/` - Calendar, CalendarDay, CalendarHeader components
- `src/hooks/useTherapists.ts` - `useTherapistAvailabilitySummary` hook
- `app/therapist/[id].tsx` - Availability tab integration

#### Instant Call (Talk Now) Feature
Allows users to instantly connect with available therapists without manual selection:

**Flow:**
1. User taps "Talk Now" on home screen → navigates to `/instant-call`
2. App fetches available therapists sorted by match score
3. Matching algorithm: Language match (100 pts) > Rating (0-50 pts) > Experience (0-10 pts)
4. Automatically calls first therapist in ranked list
5. If no response in 10 seconds (5s in dev), cancels and calls next therapist
6. If therapist accepts → navigates to video session
7. If therapist declines → immediately tries next
8. If all therapists tried → shows "no therapists available"

**UI States:**
- `searching` - Animated search indicator while fetching therapists
- `calling` - Shows therapist avatar, name, rating while calling
- `connecting` - Success state before navigating to session
- `no_therapists` - Empty state when all are busy
- `error` - Error state with retry option

Key files:
- `app/instant-call/index.tsx` - Instant call search screen
- `app/instant-call/[id].tsx` - Direct call to specific therapist
- `src/services/call-signaling.ts` - Firebase Firestore call management
- `src/services/therapists.ts` - `findAvailableForInstantCall()` method

**Call Signaling (Firebase Firestore):**
- Calls stored in `calls` collection with status: pending → ringing → accepted/declined/missed/cancelled → ended
- Real-time listeners for call status changes
- Channel name format: `ch-{userId8chars}-{therapistId8chars}-{timestamp36}`

#### Push Notifications

Uses `@react-native-firebase/messaging` for FCM token management and `@notifee/react-native` for notification display. Replaced `expo-notifications`.

**Architecture:**
- **Token source**: `@react-native-firebase/messaging` provides FCM tokens on both platforms. On iOS, Firebase registers with APNs and returns a mapped FCM token.
- **Foreground display**: `@notifee/react-native` displays local notifications when app is in foreground (Firebase does not show notifications in foreground by default).
- **Background/killed**: FCM/APNs handles display automatically via system notification.
- **Tap handling**: `notifee.onForegroundEvent`, `notifee.onBackgroundEvent`, and `messaging().onNotificationOpenedApp()` for navigation.

**Top-level handlers** (registered in `app/_layout.tsx`, outside React components):
- `messaging().setBackgroundMessageHandler()` — background message processing
- `messaging().onMessage()` → calls `pushNotificationService.handleForegroundMessage()` — foreground display via notifee
- `notifee.onForegroundEvent()` — notification tap while app is open
- `notifee.onBackgroundEvent()` — notification tap from background/killed
- `messaging().onNotificationOpenedApp()` — Firebase notification tap from background

**Chat notification suppression**: When user is on a chat screen, `activeChatAppointmentId` is set. Foreground notifications with matching `appointmentId` and `screen: 'chat'` are suppressed.

**API push notification format** (sent via Firebase Admin SDK `messaging.send()`):
- Top-level `notification: { title, body }` for both platforms
- `data` payload with `type`, `screen`, `appointmentId`, `badgeCount`
- iOS: additional `apns.payload.aps` with badge, sound, thread-id, content-available
- Android: `android.priority: 'high'`, sound, channelId, notificationCount

**Notification types and navigation:**
| Type | Screen | Navigation |
|------|--------|------------|
| `THERAPIST_MESSAGE` | `chat` | `/chat/{appointmentId}` |
| `BOOKING_CONFIRMATION` | `appointment-details` | `/appointment/{appointmentId}` |
| `APPOINTMENT_REMINDER` | `appointment-details` or `join-session` | `/appointment/{appointmentId}` or `/session/{appointmentId}` |
| `PAYMENT_RECEIPT` | `payment-details` | `/(tabs)/appointments` |
| `SYSTEM` | varies | `/notifications` |

Key files:
- `src/services/push-notifications.ts` - FCM token, notifee display, navigation
- `src/services/notifications.ts` - API calls for notifications CRUD and device token
- `src/hooks/useNotifications.ts` - React Query hooks for notification data
- `app/_layout.tsx` - Top-level message and event handlers

#### Appointment Reminders

Cron-based reminders sent at 24H, 1H, and 15MIN before each confirmed appointment.

**Flow:**
1. When an appointment is confirmed, `RemindersService.createRemindersForAppointment()` creates `AppointmentReminder` records
2. A `@Cron(EVERY_MINUTE)` job in `RemindersService.processReminders()` finds due reminders
3. Sends push notifications to both patient and therapist
4. Marks reminders as sent (`sentAt` timestamp)
5. Skips cancelled/completed appointments

**Test endpoint:** `POST /api/v1/appointments/:id/test-reminder?type=15MIN` — sends reminder immediately to the requesting user.

Key files:
- `src/reminders/reminders.service.ts` - Cron job, reminder creation, notification dispatch
- `src/reminders/reminders.module.ts` - Module registration

### Admin Panel Structure

React Router with protected routes:
- `src/pages/` - Page components by feature
- `src/components/layout/Layout.tsx` - Sidebar navigation shell
- `src/store/auth.ts` - Zustand with persist middleware
- Uses TailwindCSS utility classes with `cn()` helper for merging

### Database Schema

PostgreSQL with Prisma ORM. Key models in `apps/api/prisma/schema.prisma`:
- **User** - All users (USER, THERAPIST, ADMIN roles)
  - Social auth fields: `googleId`, `appleId` (for linking social accounts)
  - Profile fields: `firstName`, `lastName`, `displayName`, `avatarUrl`, `bio`
  - Verification: `emailVerified`, `phoneVerified`, `otpCode`, `otpExpiresAt`
- **Therapist** - Extended profile linked to User, includes verification status
- **Appointment** - Bookings with status workflow (PENDING → CONFIRMED → COMPLETED)
- **AppointmentReminder** - Scheduled reminders (24H, 1H, 15MIN) with `scheduledFor` and `sentAt`
- **Payment** - Stripe integration, tracks amounts in cents
- **Review** - 1-5 star ratings with optional feedback
- **Notification** - In-app notifications with type, read status, and JSON data
- **DeviceToken** - FCM device tokens per user with platform (ios/android)

All monetary values stored as integers (cents). Timestamps use `@default(now())` and `@updatedAt`.

## Environment Variables

### API (`apps/api/.env`)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hopefull?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1d"

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Mobile (`apps/mobile/.env`)

```bash
# Firebase Client SDK
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Feature Flags
EXPO_PUBLIC_USE_FIREBASE_AUTH=false  # true = Firebase Phone Auth, false = API OTP

# Google Sign-In (from Firebase Console → Authentication → Sign-in method → Google)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## Firebase Setup

### Initial Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Download service account JSON for API (Project Settings → Service accounts)
3. Get web config for mobile (Project Settings → General → Your apps → Add app → Web)

### Enable Authentication Methods
1. Go to Authentication → Sign-in method
2. Enable **Phone** authentication (for OTP verification)
3. Enable **Google** authentication:
   - Copy the Web client ID for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
4. Enable **Apple** authentication (for iOS):
   - Requires Apple Developer account and Sign in with Apple capability
5. Add test phone numbers for development (optional)

### Enable Firestore (for Avatar Storage)
1. Go to Build → Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" for development:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /avatars/{userId} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
4. Select your Cloud Firestore location
5. Click "Done"

### Enable Cloud Messaging (for Push Notifications)
1. Go to Project Settings → Cloud Messaging
2. **iOS**: Upload APNs authentication key (.p8 file) or APNs certificate
   - Get the key from Apple Developer → Certificates, Identifiers & Profiles → Keys → Create Key with APNs
   - Enter Key ID and Team ID in Firebase Console
3. **Android**: FCM is enabled by default with `google-services.json`

### Mobile App Configuration (Android)
1. Add Android app in Firebase Console (Project Settings → General → Your apps)
2. Download `google-services.json` to `apps/mobile/android/app/`
3. Add SHA-1 fingerprint for Google Sign-In:
   ```bash
   cd apps/mobile/android && ./gradlew signingReport
   ```
4. Notifee Maven repository is configured in `android/build.gradle` (resolved via Node)
5. Firebase messaging manifest conflict is resolved with `tools:replace` in `AndroidManifest.xml`

### Mobile App Configuration (iOS)
1. Add iOS app in Firebase Console
2. Download `GoogleService-Info.plist` to `apps/mobile/ios/`
3. Enable "Sign in with Apple" capability in Xcode
4. Add URL scheme for Google Sign-In (reversed client ID)
5. `aps-environment` entitlement is already configured (change to `production` for App Store)
6. Firebase method swizzling is enabled (default) — automatically handles APNs token registration

## Key Mobile Dependencies

| Package | Purpose |
|---------|---------|
| `@react-native-firebase/app` | Firebase core SDK |
| `@react-native-firebase/auth` | Firebase Authentication |
| `@react-native-firebase/messaging` | FCM push notifications, APNs token management |
| `@react-native-firebase/firestore` | Firestore for chat and call signaling |
| `@notifee/react-native` | Local notification display, Android channels, badge count |
| `@react-native-google-signin/google-signin` | Google Sign-In native SDK |
| `expo-apple-authentication` | Apple Sign-In (iOS) |
| `expo-local-authentication` | Biometric authentication |
| `expo-secure-store` | Secure credential storage |
| `expo-image-picker` | Camera and photo library access |
| `expo-image-manipulator` | Image resize and compression |
| `expo-haptics` | Haptic feedback |
| `expo-linking` | Deep linking (required by expo-router) |
| `expo-device` | Device info for API service |
| `expo-crypto` | Crypto utilities for social auth |
| `rn-firebase-chat` | Chat UI with Firestore backend |
| `zustand` | State management |
| `axios` | HTTP client with interceptors |
