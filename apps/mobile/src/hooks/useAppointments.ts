import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsService, CreateAppointmentData, CreateReviewData } from '../services';
import type { AppointmentFilters } from '../types';

/**
 * Returns the count of confirmed appointments starting within the next 24 hours.
 * Used to drive the Appointments tab badge.
 */
export function useUpcomingSessionBadge() {
  return useQuery({
    queryKey: ['appointments', { status: 'upcoming' }],
    queryFn: () => appointmentsService.findByUser({ status: 'upcoming' }),
    select: (appointments) => {
      const now = Date.now();
      const in24h = now + 24 * 60 * 60 * 1000;
      return appointments.filter((a) => {
        const t = new Date(a.scheduledAt).getTime();
        return (
          (a.status === 'CONFIRMED' || a.status === 'PENDING') &&
          t > now &&
          t <= in24h
        );
      }).length;
    },
    refetchInterval: 60_000, // refresh every minute
  });
}

export function useAppointments(filters?: AppointmentFilters) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => appointmentsService.findByUser(filters),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsService.findById(id),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentData) => appointmentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      appointmentsService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useAddReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reviewData }: { id: string; reviewData: CreateReviewData }) =>
      appointmentsService.addReview(id, reviewData),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
