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
  | 'reminder'
  | 'booked'
  | 'pet_added'
  | 'pet_updated';

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
    case 'booked':
      return {
        notification_type: 'new_appointment',
        subject: `New appointment booked — ${appointmentNumber}`,
        content: `A client has booked appointment ${appointmentNumber}. Please review and confirm at your earliest convenience.`,
      };
    case 'pet_added':
      return {
        notification_type: 'new_pet',
        subject: `New pet registered — ${appointmentNumber}`,
        content: `A client has added a new pet "${appointmentNumber}" to their profile. You can view it in the CMS Pet Management tab.`,
      };
    case 'pet_updated':
      return {
        notification_type: 'new_pet',
        subject: `Pet profile updated — ${appointmentNumber}`,
        content: `A client has updated their pet "${appointmentNumber}"'s profile information.`,
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

// ── sendAdminNotification ─────────────────────────────────────────────────────

export async function sendAdminNotification(params: {
  type: AppointmentNotificationType;
  label: string;
  appointmentId?: string;
  petId?: string;
  clientUserId?: string;
}): Promise<void> {
  await fetch('/api/notifications/send-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: params.type,
      label: params.label,
      appointmentId: params.appointmentId,
      petId: params.petId,
      clientUserId: params.clientUserId,
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
    .not('notification_type', 'in', '(appointment_booked,pet_added,pet_updated)')
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

export async function markNotificationRead(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('notification_logs')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) {
    console.error('[markNotificationRead]', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ── markAllNotificationsRead ──────────────────────────────────────────────────

export async function markAllNotificationsRead(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('notification_logs')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', userId);
  if (error) {
    console.error('[markAllNotificationsRead]', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
