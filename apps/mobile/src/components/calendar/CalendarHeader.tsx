import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarHeaderProps {
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoBack?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CalendarHeader({
  month,
  year,
  onPrevMonth,
  onNextMonth,
  canGoBack = true,
}: CalendarHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
        onPress={onPrevMonth}
        disabled={!canGoBack}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={canGoBack ? '#374151' : '#D1D5DB'}
        />
      </TouchableOpacity>

      <Text style={styles.monthYear}>
        {MONTH_NAMES[month]} {year}
      </Text>

      <TouchableOpacity style={styles.navButton} onPress={onNextMonth}>
        <Ionicons name="chevron-forward" size={24} color="#374151" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
});
