import { apiRequest } from './api';

export type NotifType = 'emergency' | 'update' | 'assignment' | 'resolved' | 'alert' | 'system';

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotifType;
  title: string;
  message: string;
  read: boolean;
  time: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  priority?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
  total_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkAllReadResponse {
  updated_count: number;
  message: string;
}

export const notificationsApi = {
  getNotifications: (): Promise<NotificationListResponse> => {
    return apiRequest<NotificationListResponse>('/api/notifications');
  },

  getUnreadCount: (): Promise<UnreadCountResponse> => {
    return apiRequest<UnreadCountResponse>('/api/notifications/unread-count');
  },

  markAsRead: (id: string): Promise<NotificationItem> => {
    return apiRequest<NotificationItem>(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: (): Promise<MarkAllReadResponse> => {
    return apiRequest<MarkAllReadResponse>('/api/notifications/read-all', {
      method: 'PATCH',
    });
  },
};
