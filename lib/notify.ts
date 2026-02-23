import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// FIX: Only use enum values that actually exist in the DB:
// appointment_reminder, test_results, payment_due,
// appointment_confirmed, appointment_cancelled, general
export type NotificationType =
  | 'appointment_reminder'
  | 'appointment_confirmed'   // FIX: was 'appointment_update' — not in DB enum
  | 'appointment_cancelled'
  | 'payment_due'
  | 'general'
  | 'test_results';

interface SendNotificationParams {
  recipient_id: string;
  notification_type: NotificationType;
  subject: string;
  content: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export async function sendClientNotification(params: SendNotificationParams) {
  const { data, error } = await supabaseAdmin
    .from('notification_logs')
    .insert({
      recipient_id: params.recipient_id,
      notification_type: params.notification_type,
      subject: params.subject,
      content: params.content,
      related_entity_type: params.related_entity_type || null,
      related_entity_id: params.related_entity_id || null,
      is_read: false,
      delivery_status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[sendClientNotification] Failed to insert notification:', error);
  }

  return data;
}

export function getAppointmentNotificationPayload(
  status: string,
  appointmentNumber: string,
  scheduledDate: string,
): { type: NotificationType; subject: string; content: string } {
  const date = new Date(scheduledDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const time = new Date(scheduledDate).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  switch (status) {
    case 'confirmed':
      return {
        type: 'appointment_confirmed', // FIX: was 'appointment_update'
        subject: 'Appointment Confirmed ✅',
        content: `Your appointment #${appointmentNumber} on ${date} at ${time} has been confirmed. We look forward to seeing you and your pet!`,
      };
    case 'completed':
      return {
        type: 'appointment_confirmed', // FIX: was 'appointment_update', closest valid enum
        subject: 'Appointment Completed',
        content: `Your appointment #${appointmentNumber} has been marked as completed. Thank you for visiting us! Please check your records for any follow-up instructions.`,
      };
    case 'cancelled':
      return {
        type: 'appointment_cancelled',
        subject: 'Appointment Cancelled',
        content: `Your appointment #${appointmentNumber} scheduled for ${date} at ${time} has been cancelled. Please contact us to reschedule if needed.`,
      };
    case 'pending':
      return {
        type: 'appointment_reminder',
        subject: 'Appointment Pending Review',
        content: `Your appointment #${appointmentNumber} on ${date} at ${time} is pending confirmation. We'll notify you once it's confirmed.`,
      };
    case 'no_show':
      return {
        type: 'general', // FIX: was 'appointment_update'
        subject: 'Missed Appointment',
        content: `You were marked as a no-show for appointment #${appointmentNumber} on ${date}. Please contact us to reschedule.`,
      };
    default:
      return {
        type: 'general', // FIX: was 'appointment_update'
        subject: 'Appointment Updated',
        content: `Your appointment #${appointmentNumber} has been updated. Status: ${status}.`,
      };
  }
}

export function getPetNotificationPayload(
  action: 'updated' | 'archived' | 'record_added',
  petName: string,
): { type: NotificationType; subject: string; content: string } {
  switch (action) {
    case 'updated':
      return {
        type: 'general',
        subject: `${petName}'s Profile Updated`,
        content: `The profile for your pet ${petName} has been updated by the clinic. Please review the changes in My Pets.`,
      };
    case 'archived':
      return {
        type: 'general', // FIX: was 'system_alert' — not in DB enum
        subject: `${petName}'s Profile Archived`,
        content: `Your pet ${petName}'s profile has been archived. Please contact the clinic if you believe this is an error.`,
      };
    case 'record_added':
      return {
        type: 'general',
        subject: `New Medical Record for ${petName}`,
        content: `A new medical record has been added for ${petName}. You can view the details in My Pets > Medical Records.`,
      };
  }
}