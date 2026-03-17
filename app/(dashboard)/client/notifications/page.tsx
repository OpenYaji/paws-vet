'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import {
  getClientNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRecord,
} from '@/lib/notifications';
import {
  Bell, Calendar, CreditCard, AlertTriangle,
  Info, CheckCircle, RefreshCw, CheckCheck,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function NotifIcon({ type }: { type: string }) {
  const cls = 'flex-shrink-0';
  if (type === 'appointment_confirmed' || type === 'appointment_reminder')
    return <Calendar size={18} className={`${cls} text-primary`} />;
  if (type === 'appointment_cancelled')
    return <AlertTriangle size={18} className={`${cls} text-destructive`} />;
  if (type === 'payment_due')
    return <CreditCard size={18} className={`${cls} text-amber-500`} />;
  if (type === 'test_results')
    return <CheckCircle size={18} className={`${cls} text-purple-500`} />;
  return <Info size={18} className={`${cls} text-muted-foreground`} />;
}

function notifBorderColor(type: string): string {
  if (type === 'appointment_confirmed') return 'border-l-primary';
  if (type === 'appointment_reminder') return 'border-l-primary/60';
  if (type === 'appointment_cancelled') return 'border-l-destructive';
  if (type === 'payment_due') return 'border-l-amber-400';
  if (type === 'test_results') return 'border-l-purple-400';
  return 'border-l-border';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadNotifications = useCallback(async (uid: string) => {
    setLoading(true);
    const result = await getClientNotifications(uid);
    setNotifications(result.notifications);
    setUnreadCount(result.unreadCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadNotifications(user.id);
      } else {
        setLoading(false);
      }
    });
  }, [loadNotifications]);

  const handleMarkRead = async (notif: NotificationRecord) => {
    if (notif.is_read) return;
    await markNotificationRead(notif.id);
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n),
    );
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    setMarkingAll(true);
    await markAllNotificationsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  };

  const handleRefresh = () => {
    if (userId) loadNotifications(userId);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Bell size={22} className="text-primary" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[24px] h-[24px] rounded-full bg-primary text-primary-foreground text-xs font-bold px-1.5 animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Stay updated on your appointments and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-all duration-150 disabled:opacity-55"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all duration-150 disabled:opacity-55"
            >
              <CheckCheck size={14} />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Loading notifications…</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
            <Bell size={32} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">No notifications yet</h3>
            <p className="text-sm text-muted-foreground">
              We&apos;ll let you know when something needs your attention
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => handleMarkRead(notif)}
              className={[
                'w-full text-left bg-card rounded-xl border border-border border-l-4',
                notifBorderColor(notif.notification_type),
                'shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-150 px-5 py-4 flex items-start gap-3',
                !notif.is_read ? 'bg-primary/[0.06] dark:bg-primary/[0.10]' : '',
              ].join(' ')}
            >
              <div className="mt-0.5">
                <NotifIcon type={notif.notification_type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-snug ${notif.is_read ? 'font-medium text-foreground' : 'font-semibold text-foreground'}`}>
                    {notif.subject || notif.content}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>
                </div>
                {notif.subject && notif.content && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                    {notif.content}
                  </p>
                )}
                {!notif.is_read && (
                  <p className="text-[10px] text-primary/60 mt-1.5 font-medium">
                    Tap to mark as read
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
