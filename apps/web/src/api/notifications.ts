import { api } from './client';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (params: { unread?: boolean; page?: number; pageSize?: number } = {}) => api.getPaginated<NotificationDto>('/notifications', { params }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.post<{ id: string; isRead: boolean }>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ updated: number }>('/notifications/read-all'),
};
