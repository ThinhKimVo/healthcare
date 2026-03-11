import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth';
import { useUpcomingSessionBadge } from '../../src/hooks/useAppointments';

function AppointmentsBadgeIcon({ color, size }: { color: string; size: number }) {
  const { data: badgeCount = 0 } = useUpcomingSessionBadge();
  return (
    <View>
      <Ionicons name="calendar" size={size} color={color} />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const isTherapist = user?.role === 'THERAPIST';

  if (!isLoading && !isAuthenticated) {
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
          if (route.name === 'appointments' && !isTherapist) {
            return <AppointmentsBadgeIcon color={color} size={size} />;
          }

          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'index') iconName = 'home';
          else if (route.name === 'appointments') iconName = 'calendar';
          else if (route.name === 'therapists') iconName = 'people';
          else if (route.name === 'profile') iconName = 'person';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        title: route.name === 'index' ? 'Home' :
               route.name === 'appointments' ? t('appointments.title') :
               route.name === 'therapists' ? t('therapists.title') :
               route.name === 'profile' ? t('profile.title') : route.name,
        href: route.name === 'therapists' && isTherapist ? null : undefined,
      })}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
});
