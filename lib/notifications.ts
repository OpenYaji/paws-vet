/**
 * lib/notifications.ts
 * Client-safe notification utilities for PawsVet.
 *
 * sendAppointmentNotification  — posts to /api/notifications/send (server inserts with admin key)
 * getClientNotifications       — reads notification_logs via browser supabase client
 * markNotificationRead         — updates is_read via browser supabase client
 * markAllNotificationsRead     — batch update via browser supabase client
 */

import { supabase } from '@/lib/auth-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppointmentNotificationType =
  | 'confirmed'
  | 'cancelled'
  | 'rescheduled'
  | 'payment_verified'
  | 'reminder';

export interface NotificationRecord {
  id: string;
  notification_type: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  delivery_status?: string;
}

export interface NotificationsResult {
  notifications: NotificationRecord[];
  unreadCount: number;
}

// ── Notification copy map ─────────────────────────────────────────────────────

function buildPayload(
  type: AppointmentNotificationType,
  appointmentNumber: string,
): { subject: string; content: string; notification_type: string } {
  switch (type) {
    case 'confirmed':
      return {
        notification_type: 'appointment_confirmed',
        subject: `Your appointment ${appointmentNumber} has been confirmed!`,
        content: `Great news! Your appointment ${appointmentNumber} has been confirmed by our veterinary team. Please arrive 10 minutes before your scheduled time.`,
      };
    case 'cancelled':
      return {
        notification_type: 'appointment_cancelled',
        subject: `Your appointment ${appointmentNumber} has been cancelled.`,
        content: `We're sorry to inform you that appointment ${appointmentNumber} has been cancelled. Please contact us to reschedule at your earliest convenience.`,
      };
    case 'rescheduled':
      return {
        notification_type: 'appointment_confirmed',
        subject: `Your appointment ${appointmentNumber} has been rescheduled.`,
        content: `Your appointment ${appointmentNumber} has been rescheduled to a new date and time. Please check your updated appointment details on your dashboard.`,
      };
    case 'payment_verified':
      return {
        notification_type: 'payment_due',
        subject: `Payment for appointment ${appointmentNumber} confirmed. ✓`,
        content: `Your payment for appointment ${appointmentNumber} has been verified and recorded. Thank you for completing your payment!`,
      };
    case 'reminder':
      return {
        notification_type: 'appointment_reminder',
        subject: `Reminder: You have an appointment tomorrow — ${appointmentNumber}`,
        content: `This is a friendly reminder that you have appointment ${appointmentNumber} scheduled for tomorrow. Please ensure your pet is ready and arrive on time.`,
      };
  }
}

// ── sendAppointmentNotification ───────────────────────────────────────────────

export async function sendAppointmentNotification(params: {
  clientUserId: string;
  appointmentId: string;
  appointmentNumber: string;
  type: AppointmentNotificationType;
}): Promise<void> {
  const { subject, content, notification_type } = buildPayload(
    params.type,
    params.appointmentNumber,
  );

  await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient_id: params.clientUserId,
      notification_type,
      subject,
      content,
      related_entity_type: 'appointment',
      related_entity_id: params.appointmentId,
    }),
  });
}

// ── getClientNotifications ────────────────────────────────────────────────────

export async function getClientNotifications(
  userId: string,
): Promise<NotificationsResult> {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[getClientNotifications]', error);
    return { notifications: [], unreadCount: 0 };
  }

  const notifications = data as NotificationRecord[];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  return { notifications, unreadCount };
}

// ── markNotificationRead ──────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('notification_logs')
    .update({ is_read: true })
    .eq('id', notificationId);
}

// ── markAllNotificationsRead ──────────────────────────────────────────────────

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notification_logs')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
}
