import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { notificationsService } from '../services';
import { pushNotificationService } from '../services/push-notifications';

export function useNotifications(limit = 20) {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) => notificationsService.getAll(pageParam, limit),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useUnreadNotificationCount() {
  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Sync app badge count with unread notifications
  useEffect(() => {
    if (query.data !== undefined) {
      pushNotificationService.setBadgeCount(query.data);
    }
  }, [query.data]);

  return query;
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRegisterDeviceToken() {
  return useMutation({
    mutationFn: ({ token, platform }: { token: string; platform: string }) =>
      notificationsService.registerDeviceToken(token, platform),
  });
}

export function useRemoveDeviceToken() {
  return useMutation({
    mutationFn: (token: string) => notificationsService.removeDeviceToken(token),
  });
}
