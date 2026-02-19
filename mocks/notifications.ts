import { Notification } from '@/types/notifications';

export const mockNotifications: Notification[] = [
  {
    id: "notif_1",
    recipient_id: "user_123",
    notification_type: "appointment_reminder",
    subject: "Upcoming Appointment - Max",
    content: "You have an appointment with Max (Golden Retriever) today at 2:00 PM. Please arrive 10 minutes early.",
    sent_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    delivery_status: "delivered",
    delivery_attempted_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    delivered_at: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
    error_message: null,
    related_entity_type: "appointment",
    related_entity_id: "apt_123",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: "notif_2",
    recipient_id: "user_123",
    notification_type: "test_results",
    subject: "Lab Results Ready - Luna",
    content: "Blood work results for Luna are now available. All values are within normal range.",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    delivery_status: "delivered",
    delivery_attempted_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    delivered_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    error_message: null,
    related_entity_type: "lab_result",
    related_entity_id: "lab_456",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: "notif_3",
    recipient_id: "user_123",
    notification_type: "payment_due",
    subject: "Payment Reminder",
    content: "Invoice #INV-2026-001 ($150.00) is due in 3 days. Please visit the billing section to pay online.",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    delivery_status: "delivered",
    delivery_attempted_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    delivered_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    error_message: null,
    related_entity_type: "invoice",
    related_entity_id: "inv_789",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: "notif_4",
    recipient_id: "user_123",
    notification_type: "appointment_confirmed",
    subject: "Appointment Confirmed - Bella",
    content: "Your appointment for Bella (Siamese Cat) has been confirmed for February 18, 2026 at 10:30 AM with Dr. Sarah Johnson.",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    delivery_status: "delivered",
    delivery_attempted_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    delivered_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    error_message: null,
    related_entity_type: "appointment",
    related_entity_id: "apt_789",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: "notif_5",
    recipient_id: "user_123",
    notification_type: "appointment_cancelled",
    subject: "Appointment Cancelled - Rocky",
    content: "Your appointment for Rocky scheduled on February 16, 2026 at 3:00 PM has been cancelled due to an emergency. Please call to reschedule.",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    delivery_status: "delivered",
    delivery_attempted_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    delivered_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    error_message: null,
    related_entity_type: "appointment",
    related_entity_id: "apt_456",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  },
  {
    id: "notif_6",
    recipient_id: "user_123",
    notification_type: "general",
    subject: "Clinic Holiday Hours",
    content: "PAWS Veterinary Clinic will be closed on February 20, 2026 for a staff training day. Emergency services will still be available.",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    delivery_status: "delivered",
    delivery_attempted_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    delivered_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    error_message: null,
    related_entity_type: null,
    related_entity_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
  },
  {
    id: "notif_7",
    recipient_id: "user_123",
    notification_type: "test_results",
    subject: "X-Ray Results - Charlie",
    content: "X-ray results for Charlie show no abnormalities. Dr. Smith will discuss the findings during your next visit.",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
    delivery_status: "delivered",
    delivery_attempted_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    delivered_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    error_message: null,
    related_entity_type: "lab_result",
    related_entity_id: "xray_123",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString()
  },
  {
    id: "notif_8",
    recipient_id: "user_123",
    notification_type: "appointment_reminder",
    subject: "Vaccination Due - Whiskers",
    content: "Whiskers is due for annual vaccinations. Please schedule an appointment at your earliest convenience.",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
    delivery_status: "delivered",
    delivery_attempted_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    delivered_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    error_message: null,
    related_entity_type: "pet",
    related_entity_id: "pet_whiskers",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString()
  }
];

// Helper function to simulate receiving a new notification
export function simulateNewNotification(): Notification {
  const types: Array<Notification['notification_type']> = [
    'appointment_reminder',
    'appointment_confirmed',
    'appointment_cancelled',
    'test_results',
    'payment_due',
    'general'
  ];
  
  const randomType = types[Math.floor(Math.random() * types.length)];
  const now = new Date().toISOString();
  
  const mockMessages: Record<Notification['notification_type'], { subject: string; content: string }> = {
    appointment_reminder: {
      subject: "Reminder: Upcoming Appointment",
      content: "Don't forget about your appointment tomorrow at 3:00 PM with Dr. Johnson."
    },
    appointment_confirmed: {
      subject: "Appointment Confirmed",
      content: "Your appointment has been successfully confirmed for next week."
    },
    appointment_cancelled: {
      subject: "Appointment Cancelled",
      content: "Unfortunately, your appointment has been cancelled. Please reschedule."
    },
    test_results: {
      subject: "New Test Results Available",
      content: "Lab results are now ready for review in your patient portal."
    },
    payment_due: {
      subject: "Payment Reminder",
      content: "You have an outstanding balance of $85.00. Please make a payment soon."
    },
    general: {
      subject: "Important Update",
      content: "We have updated our office hours. Please check our website for details."
    }
  };

  return {
    id: `notif_new_${Date.now()}`,
    recipient_id: "user_123",
    notification_type: randomType,
    subject: mockMessages[randomType].subject,
    content: mockMessages[randomType].content,
    sent_at: now,
    delivery_status: "delivered",
    delivery_attempted_at: now,
    delivered_at: now,
    error_message: null,
    related_entity_type: "appointment",
    related_entity_id: `apt_${Date.now()}`,
    created_at: now
  };
}