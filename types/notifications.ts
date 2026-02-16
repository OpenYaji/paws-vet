// types/notifications.ts
// Import types from centralized database types
import { NotificationType, NotificationStatus } from './database';

// Main Notification Interface matching notification_logs table
export interface Notification {
  id: string;
  recipient_id: string;
  notification_type: NotificationType;  // From './database'
  subject: string | null;
  content: string;
  sent_at: string;
  delivery_status: NotificationStatus;  // From './database'
  delivery_attempted_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  created_at: string;  // This is REQUIRED (no ?)
}

// Extended notification with user info
export interface NotificationWithUser extends Notification {
  recipient?: {
    id: string;
    email: string;
    role: string;
  };
}

// Notification filter options
export interface NotificationFilters {
  notification_type?: NotificationType[];
  delivery_status?: NotificationStatus[];
  date_from?: string;
  date_to?: string;
  unread_only?: boolean;
}

// Create notification request
export interface CreateNotificationRequest {
  recipient_id: string;
  notification_type: NotificationType;
  subject?: string;
  content: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

// Re-export types from database for convenience
export type { NotificationType, NotificationStatus } from './database';