// Example: How to send notifications in your app
// This file demonstrates how to create and send notifications

import { supabase } from '@/lib/auth-client';
import { NotificationType } from '@/types/notifications';

/**
 * Send a notification to a user
 */
export async function sendNotification({
  recipientId,
  type,
  subject,
  content,
  relatedEntityType,
  relatedEntityId,
}: {
  recipientId: string;
  type: NotificationType;
  subject?: string;
  content: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: recipientId,
        notification_type: type,
        subject,
        content,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Example: Send appointment reminder
 */
export async function sendAppointmentReminder(
  recipientId: string,
  appointmentId: string,
  petName: string,
  appointmentDate: string
) {
  return sendNotification({
    recipientId,
    type: 'appointment_reminder',
    subject: `Appointment Reminder for ${petName}`,
    content: `Your appointment for ${petName} is scheduled for ${appointmentDate}. Please arrive 10 minutes early.`,
    relatedEntityType: 'appointment',
    relatedEntityId: appointmentId,
  });
}

/**
 * Example: Send appointment confirmation
 */
export async function sendAppointmentConfirmation(
  recipientId: string,
  appointmentId: string,
  petName: string,
  appointmentDate: string
) {
  return sendNotification({
    recipientId,
    type: 'appointment_confirmed',
    subject: `Appointment Confirmed for ${petName}`,
    content: `Your appointment for ${petName} has been confirmed for ${appointmentDate}.`,
    relatedEntityType: 'appointment',
    relatedEntityId: appointmentId,
  });
}

/**
 * Example: Send test results notification
 */
export async function sendTestResults(
  recipientId: string,
  petName: string,
  testType: string
) {
  return sendNotification({
    recipientId,
    type: 'test_results',
    subject: `Test Results Available for ${petName}`,
    content: `${testType} results for ${petName} are now available. Please log in to view them.`,
  });
}

/**
 * Example: Send payment due notification
 */
export async function sendPaymentDue(
  recipientId: string,
  invoiceId: string,
  amount: number,
  dueDate: string
) {
  return sendNotification({
    recipientId,
    type: 'payment_due',
    subject: 'Payment Due',
    content: `You have an outstanding balance of $${amount.toFixed(2)} due on ${dueDate}.`,
    relatedEntityType: 'invoice',
    relatedEntityId: invoiceId,
  });
}

/**
 * Example: Using in a component
 * 
 * import { sendAppointmentConfirmation } from '@/lib/notification-examples';
 * 
 * // When confirming an appointment:
 * const handleConfirmAppointment = async () => {
 *   try {
 *     // Update appointment status
 *     await updateAppointmentStatus(appointmentId, 'confirmed');
 *     
 *     // Send notification to pet owner
 *     await sendAppointmentConfirmation(
 *       ownerId,
 *       appointmentId,
 *       'Buddy',
 *       'March 15, 2026 at 2:00 PM'
 *     );
 *     
 *     toast.success('Appointment confirmed and notification sent!');
 *   } catch (error) {
 *     console.error('Error:', error);
 *     toast.error('Failed to confirm appointment');
 *   }
 * };
 */

/**
 * Example: Listening to notifications (already implemented in NotificationBell component)
 * 
 * The NotificationBell component automatically:
 * 1. Subscribes to real-time notifications using Supabase Realtime
 * 2. Shows a red dot indicator for new notifications
 * 3. Displays browser notifications when tab is not visible
 * 4. Updates the notification list in real-time
 * 
 * Usage:
 * import { NotificationBell } from '@/components/notifications/notification-bell';
 * 
 * <NotificationBell userId={currentUserId} />
 */
