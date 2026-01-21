import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface CalendarDayProps {
  day: number;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  hasSlots: boolean;
  onPress: () => void;
}

export function CalendarDay({
  day,
  isSelected,
  isToday,
  isPast,
  hasSlots,
  onPress,
}: CalendarDayProps) {
  const isDisabled = isPast;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
        isToday && !isSelected && styles.today,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.dayText,
          isSelected && styles.dayTextSelected,
          isToday && !isSelected && styles.dayTextToday,
          isDisabled && styles.dayTextDisabled,
        ]}
      >
        {day}
      </Text>
      {!isDisabled && (
        <View
          style={[
            styles.indicator,
            hasSlots ? styles.indicatorAvailable : styles.indicatorUnavailable,
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  selected: {
    backgroundColor: '#4F46E5',
  },
  today: {
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  disabled: {
    opacity: 0.4,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayTextToday: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: '#9CA3AF',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  indicatorAvailable: {
    backgroundColor: '#10B981',
  },
  indicatorUnavailable: {
    backgroundColor: '#D1D5DB',
  },
});
