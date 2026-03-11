import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth';
import { useIncomingCalls } from '../../src/hooks/useIncomingCalls';

export default function TherapistTabsLayout() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const isTherapist = user?.role === 'THERAPIST';

  // Listen for incoming calls (only for therapists)
  useIncomingCalls();

  if (!isLoading && (!isAuthenticated || !isTherapist)) {
    return null;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'index') {
            iconName = 'home';
          } else if (route.name === 'appointments') {
            iconName = 'calendar';
          } else if (route.name === 'earnings') {
            iconName = 'cash';
          } else if (route.name === 'profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        title: route.name === 'index' ? t('therapistDashboard.home') :
               route.name === 'appointments' ? t('therapistDashboard.appointments') :
               route.name === 'earnings' ? t('therapistDashboard.earnings') :
               route.name === 'profile' ? t('profile.title') : route.name,
      })}
    />
  );
}
