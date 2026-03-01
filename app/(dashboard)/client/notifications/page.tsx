'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import {
  Bell, Calendar, CreditCard, AlertTriangle, Info, Check, ChevronLeft, ChevronRight,
  Filter, Trash2, Archive, AlertCircle, Loader,
} from 'lucide-react';

interface Notification {
  id: string;
  notification_type: string;
  subject?: string;
  content: string;
  is_read: boolean;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

function getNotificationIcon(type: string, size = 18) {
  const props = { size, strokeWidth: 2 };
  switch (type) {
    case 'appointment_reminder':
    case 'appointment_confirmed':   // FIX: was 'appointment_update'
    case 'appointment_cancelled':
      return <Calendar {...props} />;
    case 'payment_due':
      return <CreditCard {...props} />;
    case 'test_results':
      return <AlertTriangle {...props} />;
    default:
      return <Info {...props} />;
  }
}

function getNotificationColorClasses(type: string) {
  switch (type) {
    case 'appointment_reminder':
    case 'appointment_confirmed':   // FIX: was 'appointment_update'
      return { bg: 'bg-accent/40', text: 'text-primary', badge: 'bg-accent' };
    case 'appointment_cancelled':
      return { bg: 'bg-destructive/10', text: 'text-destructive', badge: 'bg-destructive/15' };
    case 'payment_due':
      return { bg: 'bg-yellow-50', text: 'text-yellow-600', badge: 'bg-yellow-100' };
    case 'test_results':
      return { bg: 'bg-purple-50', text: 'text-purple-600', badge: 'bg-purple-100' };
    default:
      return { bg: 'bg-muted/30', text: 'text-muted-foreground', badge: 'bg-muted' };
  }
}

function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    appointment_reminder: 'Appointment Reminder',
    appointment_confirmed: 'Appointment Confirmed',   // FIX: was 'appointment_update'
    appointment_cancelled: 'Appointment Cancelled',
    payment_due: 'Payment Due',
    test_results: 'Test Results',
    general: 'General',
  };
  return labels[type] || 'Notification';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const itemsPerPage = 20;

  const fetchNotifications = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const url = `/api/client/notifications?user_id=${uid}&limit=${itemsPerPage}&offset=${offset}${filter === 'unread' ? '&unread_only=true' : ''}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          await fetchNotifications(user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('Authentication error');
        setLoading(false);
      }
    };
    init();
  }, [fetchNotifications]);

  useEffect(() => {
    if (userId) fetchNotifications(userId);
  }, [filter, currentPage, userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_logs', filter: `recipient_id=eq.${userId}` },
        () => {
          if (userId) fetchNotifications(userId);
        }
      )
      .subscribe();
    return () => { 
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const toggleRead = async (notificationId: string, currentIsRead: boolean) => {
    try {
      setTogglingId(notificationId);
      const res = await fetch('/api/client/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId, is_read: !currentIsRead }),
      });
      if (!res.ok) throw new Error('Failed to update notification');
      
      if (userId) await fetchNotifications(userId);
    } catch (err) {
      console.error('Failed to update notification:', err);
      setError('Failed to update notification');
    } finally {
      setTogglingId(null);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      setMarkingAllRead(true);
      const unready = notifications.filter(n => !n.is_read);
      await Promise.all(
        unready.map(n =>
          fetch('/api/client/notifications/mark-read', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification_id: n.id, is_read: true }),
          })
        )
      );
      await fetchNotifications(userId);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      setError('Failed to mark notifications as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading && notifications.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium">Loading notifications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Notifications</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">Stay updated with your appointments and account activity</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg font-semibold text-sm transition-all duration-150 active:scale-95 whitespace-nowrap"
          >
            {markingAllRead ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {markingAllRead ? 'Marking…' : 'Mark All Read'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-2xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-accent/30 rounded-xl p-3 border border-border flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setFilter('all'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 active:scale-95 ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Filter className="w-4 h-4" />
          All
        </button>
        <button
          onClick={() => { setFilter('unread'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 active:scale-95 ${
            filter === 'unread'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Filter className="w-4 h-4" />
          Unread
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </button>
        <div className="ml-auto text-sm text-muted-foreground font-medium px-2">
          {totalCount} total
        </div>
      </div>

      {/* Notifications Container */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Notifications will appear here when you have new updates'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const isUnread = !notif.is_read;
                const colors = getNotificationColorClasses(notif.notification_type);
                const icon = getNotificationIcon(notif.notification_type, 20);
                const typeLabel = getNotificationTypeLabel(notif.notification_type);

                return (
                  <div
                    key={notif.id}
                    className={`group p-5 transition-all duration-150 cursor-pointer ${
                      isUnread ? 'bg-accent/20' : 'bg-card'
                    } hover:bg-accent/30`}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colors.badge} ${colors.text}`}>
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div>
                            {notif.subject && (
                              <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
                                {notif.subject}
                              </h3>
                            )}
                            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mt-0.5">
                              {typeLabel}
                            </p>
                          </div>
                          {isUnread && (
                            <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-2">
                          {notif.content}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTimeAgo(notif.created_at)}</span>
                          <span>•</span>
                          <span>{formatDate(notif.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => toggleRead(notif.id, notif.is_read)}
                          disabled={togglingId === notif.id}
                          title={isUnread ? 'Mark as read' : 'Mark as unread'}
                          className={`p-2 rounded-lg transition-all duration-150 ${
                            isUnread
                              ? 'bg-accent hover:bg-accent/80 text-primary disabled:opacity-50'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50'
                          }`}
                        >
                          {togglingId === notif.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border bg-accent/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm text-muted-foreground font-medium">
                  Page <span className="font-bold text-foreground">{currentPage}</span> of{' '}
                  <span className="font-bold text-foreground">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-all duration-150 active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-all duration-150 active:scale-95"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}