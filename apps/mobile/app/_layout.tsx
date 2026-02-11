import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { ChatProvider } from 'rn-firebase-chat';
import { useAuthStore } from '@/store/auth';
import { useLocaleStore } from '@/store/locale';
import { configureGoogleSignIn } from '@/services/social-auth';
import { pushNotificationService } from '@/services';
import i18n from '@/i18n';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function useProtectedRoute() {
  const { user, isAuthenticated, isLoading, hasSeenOnboarding } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const hasRedirected = useRef(false);
  const pushNotificationsInitialized = useRef(false);

  // Initialize push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && !pushNotificationsInitialized.current) {
      pushNotificationsInitialized.current = true;

      // Set up callback to refresh notification count when push is received
      pushNotificationService.setOnNotificationReceived(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      pushNotificationService.initialize().catch((error) => {
        console.warn('[PushNotifications] Init error:', error);
      });
    }

    // Cleanup when logging out
    if (!isAuthenticated && pushNotificationsInitialized.current) {
      pushNotificationsInitialized.current = false;
      pushNotificationService.removeListeners();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const inTherapistTabsGroup = segments[0] === '(therapist-tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const isOnWelcome = segments.length === 0 || segments[0] === 'index';
    const isTherapist = user?.role === 'THERAPIST';

    if (__DEV__) {
      console.log('=== useProtectedRoute ===');
      console.log('isAuthenticated:', isAuthenticated);
      console.log('isTherapist:', isTherapist);
      console.log('segments:', segments);
      console.log('========================');
    }

    // First time user - show onboarding
    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    // Not authenticated and trying to access protected routes (tabs)
    // Note: Tabs layout handles its own redirect via <Redirect> component
    if (!isAuthenticated && (inTabsGroup || inTherapistTabsGroup)) {
      if (__DEV__) console.log('Not authenticated in tabs - tabs layout will redirect');
      return;
    }

    // Authenticated and on auth/welcome screens - go to appropriate tabs
    if (isAuthenticated && (inAuthGroup || isOnWelcome)) {
      if (isTherapist) {
        if (__DEV__) console.log('Redirect: welcome/auth -> therapist-tabs');
        router.replace('/(therapist-tabs)');
      } else {
        if (__DEV__) console.log('Redirect: welcome/auth -> tabs');
        router.replace('/(tabs)');
      }
      return;
    }

    // Therapist in user tabs - redirect to therapist tabs
    if (isAuthenticated && isTherapist && inTabsGroup) {
      if (__DEV__) console.log('Redirect: therapist in user tabs -> therapist-tabs');
      router.replace('/(therapist-tabs)');
      return;
    }

    // User in therapist tabs - redirect to user tabs
    if (isAuthenticated && !isTherapist && inTherapistTabsGroup) {
      if (__DEV__) console.log('Redirect: user in therapist tabs -> tabs');
      router.replace('/(tabs)');
      return;
    }

    hasRedirected.current = false;
  }, [user, isAuthenticated, segments, isLoading, navigationState?.key, hasSeenOnboarding]);
}

export default function RootLayout() {
  const { loadStoredAuth, user, isAuthenticated } = useAuthStore();
  const { initializeLocale } = useLocaleStore();

  const chatUserInfo = useMemo(() => {
    if (!isAuthenticated || !user) return undefined;
    return {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      avatar: user.avatarUrl || '',
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const init = async () => {
      // Configure Google Sign-In
      configureGoogleSignIn();

      // Initialize locale and language
      await initializeLocale();

      await loadStoredAuth();
      await SplashScreen.hideAsync();
    };
    init();
  }, []);

  useProtectedRoute();

  const content = (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          presentation: route.name === 'therapist/[id]' ? 'card' : undefined,
        })}
      />
    </>
  );

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {chatUserInfo ? (
          <ChatProvider
            {...{ userInfo: chatUserInfo, enableEncrypt: false } as any}
          >
            {content}
          </ChatProvider>
        ) : (
          content
        )}
      </QueryClientProvider>
    </I18nextProvider>
  );
}
