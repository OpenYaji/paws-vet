// lib/notification-utils.tsx
// Utility functions and icon mappings for notifications
import {
  Calendar,
  CalendarPlus,
  CalendarCheck,
  CreditCard,
  FlaskConical,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  PackageX,
  PawPrint,
  AlertTriangle,
  ShieldAlert,
  UserX,
  Megaphone,
  ClipboardList,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Notification, NotificationType, NotificationStatus } from '@/types/notifications';

// Icons for different notification types
export function getNotificationIcon(type: NotificationType, size: number = 16): ReactNode {
  const icons: Record<NotificationType, ReactNode> = {
    appointment_reminder: <Calendar size={size} className="text-blue-500" />,
    appointment_confirmed: <Calendar size={size} className="text-green-500" />,
    appointment_cancelled: <Calendar size={size} className="text-red-500" />,
    test_results: <FlaskConical size={size} className="text-purple-500" />,
    payment_due: <CreditCard size={size} className="text-orange-500" />,
    general: <Info size={size} className="text-gray-500" />,
    low_stock: <PackageX size={size} className="text-red-500" />,
    // vet-specific types
    new_appointment: <CalendarPlus size={size} className="text-blue-500" />,
    new_pet: <PawPrint size={size} className="text-teal-500" />,
    emergency: <AlertTriangle size={size} className="text-red-600" />,
    appointment_today: <CalendarCheck size={size} className="text-indigo-500" />,
    quarantine_alert: <ShieldAlert size={size} className="text-orange-500" />,
    no_show: <UserX size={size} className="text-gray-500" />,
    admin_announcement: <Megaphone size={size} className="text-purple-500" />,
    admin_duty_notice: <ClipboardList size={size} className="text-blue-600" />,
    // CMS admin types
    appointment_booked: <CalendarCheck size={size} className="text-green-500" />,
    pet_added: <PawPrint size={size} className="text-teal-500" />,
    pet_updated: <PawPrint size={size} className="text-amber-500" />,
  };

  return icons[type] || icons.general;
}

// Icons for delivery status
export function getDeliveryStatusIcon(status: NotificationStatus, size: number = 12): ReactNode {
  const icons: Record<NotificationStatus, ReactNode> = {
    pending: <Loader2 size={size} className="animate-spin text-gray-500" />,
    sent: <CheckCircle size={size} className="text-blue-500" />,
    delivered: <CheckCircle size={size} className="text-green-500" />,
    failed: <XCircle size={size} className="text-red-500" />,
  };

  return icons[status] || icons.pending;
}

// Format time ago
export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

// Get notification title/fallback
export function getNotificationTitle(notif: Notification): string {
  return notif.subject || 'New Notification';
}

// Get notification type label
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    appointment_reminder: 'Appointment Reminder',
    appointment_confirmed: 'Appointment Confirmed',
    appointment_cancelled: 'Appointment Cancelled',
    test_results: 'Test Results',
    payment_due: 'Payment Due',
    general: 'General',
    low_stock: 'Low Stock Alert',
    // vet-specific labels
    new_appointment: 'New Appointment',
    new_pet: 'New Pet Registered',
    emergency: 'Emergency',
    appointment_today: "Today's Appointment",
    quarantine_alert: 'Quarantine Alert',
    no_show: 'No Show',
    admin_announcement: 'Announcement',
    admin_duty_notice: 'Duty Notice',
    // CMS admin labels
    appointment_booked: 'Appointment Booked',
    pet_added: 'New Pet Added',
    pet_updated: 'Pet Updated',
  };

  return labels[type] || 'Notification';
}

// Get delivery status label
export function getDeliveryStatusLabel(status: NotificationStatus): string {
  const labels: Record<NotificationStatus, string> = {
    pending: 'Pending',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
  };

  return labels[status] || 'Unknown';
}

// Get color class for notification type
export function getNotificationColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    appointment_reminder: 'bg-blue-50 border-blue-200',
    appointment_confirmed: 'bg-green-50 border-green-200',
    appointment_cancelled: 'bg-red-50 border-red-200',
    test_results: 'bg-purple-50 border-purple-200',
    payment_due: 'bg-orange-50 border-orange-200',
    general: 'bg-gray-50 border-gray-200',
    low_stock: 'bg-red-50 border-red-200',
    // vet-specific colors
    new_appointment: 'bg-blue-50 border-blue-200',
    new_pet: 'bg-teal-50 border-teal-200',
    emergency: 'bg-red-100 border-red-400',
    appointment_today: 'bg-indigo-50 border-indigo-200',
    quarantine_alert: 'bg-orange-50 border-orange-200',
    no_show: 'bg-gray-50 border-gray-200',
    admin_announcement: 'bg-purple-50 border-purple-200',
    admin_duty_notice: 'bg-blue-50 border-blue-200',
    // CMS admin colors
    appointment_booked: 'bg-green-50 border-green-200',
    pet_added: 'bg-teal-50 border-teal-200',
    pet_updated: 'bg-amber-50 border-amber-200',
  };

  return colors[type] || colors.general;
}

// Sort notifications by priority
export function sortNotificationsByPriority(notifications: Notification[]): Notification[] {
  const priorityOrder: Record<NotificationType, number> = {
    emergency: 1,
    quarantine_alert: 2,
    low_stock: 3,
    appointment_cancelled: 4,
    no_show: 5,
    payment_due: 6,
    test_results: 7,
    appointment_today: 8,
    new_appointment: 9,
    appointment_reminder: 10,
    appointment_confirmed: 11,
    new_pet: 12,
    admin_announcement: 13,
    admin_duty_notice: 14,
    // CMS admin priorities
    appointment_booked: 9,
    pet_added: 12,
    pet_updated: 12,
    general: 15,
  };

  return [...notifications].sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.notification_type] - priorityOrder[b.notification_type];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by date (most recent first)
    return new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime();
  });
}

// Group notifications by date
export function groupNotificationsByDate(notifications: Notification[]): Record<string, Notification[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  notifications.forEach(notif => {
    const notifDate = new Date(notif.sent_at);
    notifDate.setHours(0, 0, 0, 0);

    if (notifDate.getTime() === today.getTime()) {
      groups.Today.push(notif);
    } else if (notifDate.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(notif);
    } else if (notifDate >= weekAgo) {
      groups['This Week'].push(notif);
    } else {
      groups.Older.push(notif);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}
