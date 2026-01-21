import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CalendarHeader } from './CalendarHeader';
import { CalendarDay } from './CalendarDay';
import type { AvailabilitySummaryDate } from '../../types';

interface CalendarProps {
  month: number;
  year: number;
  selectedDate: string | null;
  availabilityData: AvailabilitySummaryDate[];
  onDateSelect: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({
  month,
  year,
  selectedDate,
  availabilityData,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
}: CalendarProps) {
  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    };
  }, []);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [month, year]);

  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    availabilityData.forEach((item) => {
      map.set(item.date, item.hasSlots);
    });
    return map;
  }, [availabilityData]);

  const canGoBack = useMemo(() => {
    // Can go back if the previous month is the current month or later
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;

    if (prevYear > today.year) return true;
    if (prevYear === today.year && prevMonth >= today.month) return true;
    return false;
  }, [month, year, today]);

  const formatDate = (day: number): string => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };

  const isPastDate = (day: number): boolean => {
    if (year < today.year) return true;
    if (year === today.year && month < today.month) return true;
    if (year === today.year && month === today.month && day < today.day) return true;
    return false;
  };

  const isToday = (day: number): boolean => {
    return year === today.year && month === today.month && day === today.day;
  };

  return (
    <View style={styles.container}>
      <CalendarHeader
        month={month}
        year={year}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        canGoBack={canGoBack}
      />

      <View style={styles.weekDays}>
        {DAY_NAMES.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((day, index) => (
          <View key={index} style={styles.dayCell}>
            {day !== null && (
              <CalendarDay
                day={day}
                isSelected={selectedDate === formatDate(day)}
                isToday={isToday(day)}
                isPast={isPastDate(day)}
                hasSlots={availabilityMap.get(formatDate(day)) ?? false}
                onPress={() => onDateSelect(formatDate(day))}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  weekDays: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 2,
  },
});
