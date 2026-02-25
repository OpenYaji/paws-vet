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
      return { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100' };
    case 'appointment_cancelled':
      return { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100' };
    case 'payment_due':
      return { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100' };
    case 'test_results':
      return { bg: 'bg-purple-50', text: 'text-purple-600', badge: 'bg-purple-100' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-600', badge: 'bg-gray-100' };
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="inline-block mb-4">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
            <p className="text-slate-600">Loading notifications…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
              Notifications
            </h1>
            <p className="text-slate-600">Stay updated with your appointments and account activity</p>
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              {markingAllRead ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {markingAllRead ? 'Marking…' : 'Mark All Read'}
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={() => { setFilter('all'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            All Notifications
          </button>
          <button
            onClick={() => { setFilter('unread'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'unread'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="ml-auto flex items-center text-sm text-slate-500 font-medium px-4 py-2">
            {totalCount} total
          </div>
        </div>

        {/* Notifications Container */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </h3>
              <p className="text-slate-500">
                {filter === 'unread' 
                  ? 'You have no unread notifications.' 
                  : 'Notifications will appear here when you have new updates'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {notifications.map((notif, idx) => {
                  const isUnread = !notif.is_read;
                  const colors = getNotificationColorClasses(notif.notification_type);
                  const icon = getNotificationIcon(notif.notification_type, 20);
                  const typeLabel = getNotificationTypeLabel(notif.notification_type);

                  return (
                    <div
                      key={notif.id}
                      className={`group p-6 transition-all hover:bg-slate-50 cursor-pointer ${
                        isUnread ? 'bg-blue-50' : 'bg-white'
                      } ${idx === notifications.length - 1 ? '' : 'border-b border-slate-200'}`}
                    >
                      <div className="flex gap-4 items-start">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${colors.badge} ${colors.text}`}>
                          {icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              {notif.subject && (
                                <h3 className="font-semibold text-slate-900 text-base line-clamp-2">
                                  {notif.subject}
                                </h3>
                              )}
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">
                                {typeLabel}
                              </p>
                            </div>
                            {isUnread && (
                              <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-600"></div>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-3">
                            {notif.content}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{formatTimeAgo(notif.created_at)}</span>
                            <span>•</span>
                            <span>{formatDate(notif.created_at)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleRead(notif.id, notif.is_read)}
                            disabled={togglingId === notif.id}
                            title={isUnread ? 'Mark as read' : 'Mark as unread'}
                            className={`p-2 rounded-lg transition-all ${
                              isUnread
                                ? 'bg-blue-100 hover:bg-blue-200 text-blue-600 disabled:bg-blue-100'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:bg-slate-100'
                            } disabled:opacity-50`}
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
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-slate-600 font-medium">
                    Page <span className="font-bold text-slate-900">{currentPage}</span> of{' '}
                    <span className="font-bold text-slate-900">{totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-all"
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
    </div>
  );
}