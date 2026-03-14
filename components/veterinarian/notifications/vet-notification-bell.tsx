'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, BellRing, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types/notifications';
import { getNotificationIcon, timeAgo } from '@/lib/notification-utils';

interface VetNotificationBellProps {
  userId: string;
  className?: string;
}

// Emergency and quarantine alerts surface before regular notifications
const PRIORITY_TYPES = new Set(['emergency', 'quarantine_alert']);

async function authedFetch(path: string, init?: RequestInit) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export function VetNotificationBell({ userId, className = '' }: VetNotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Deduplicate real-time inserts that arrive while the list is already open
  const seenIdsRef = useRef<Set<string>>(new Set());

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  // Sort so emergency/quarantine alerts always appear at the top
  const sortNotifications = useCallback((notifs: Notification[]) => {
    return [...notifs].sort((a, b) => {
      const aPriority = PRIORITY_TYPES.has(a.notification_type) ? 0 : 1;
      const bPriority = PRIORITY_TYPES.has(b.notification_type) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime();
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setNotifLoading(true);
    try {
      const res = await authedFetch('/api/veterinarian/notifications');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Notification[] = await res.json();
      // Pre-populate seen set so fresh WS inserts don't duplicate on next open
      seenIdsRef.current = new Set(data.map(n => n.id));
      setNotifications(sortNotifications(data));
      setHasUnread(data.some(n => !n.is_read));
    } catch (err) {
      console.error('[VetNotificationBell] fetch error', err);
    } finally {
      setNotifLoading(false);
    }
  }, [userId, sortNotifications]);

  // Fetch on mount for immediate unread dot
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId, fetchNotifications]);

  // Re-fetch when the popover opens to get latest DB state
  useEffect(() => {
    if (!notifOpen || !userId) return;
    fetchNotifications();
  }, [notifOpen, userId, fetchNotifications]);

  // Real-time WebSocket: listen for new notifications inserted for this vet
  // Falls back to 30-second polling if the realtime channel fails
  useEffect(() => {
    if (!userId) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const handleIncoming = (incoming: Notification) => {
      if (seenIdsRef.current.has(incoming.id)) return;
      seenIdsRef.current.add(incoming.id);

      setNotifications(prev =>
        sortNotifications([incoming, ...prev]).slice(0, 30)
      );
      setHasUnread(true);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast(incoming);
      toastTimerRef.current = setTimeout(() => setToast(null), 6000);

      if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
        new Notification(incoming.subject || 'New Notification', {
          body: incoming.content,
          icon: '/favicon.ico',
        });
      }
    };

    const startPolling = () => {
      if (pollInterval) return; // already polling
      pollInterval = setInterval(fetchNotifications, 30_000);
    };

    const channel = supabase
      .channel(`vet-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => handleIncoming(payload.new as Notification)
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          startPolling();
        }
        if (status === 'SUBSCRIBED' && pollInterval) {
          // Realtime recovered — stop polling
          clearInterval(pollInterval);
          pollInterval = null;
        }
      });

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      channel.unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [userId, sortNotifications, fetchNotifications]);

  // Clear unread dot when popover is opened
  useEffect(() => {
    if (notifOpen && hasUnread) {
      setHasUnread(false);
      // Mark all as read in DB without blocking the UI
      authedFetch('/api/veterinarian/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      }).catch(() => {});
    }
  }, [notifOpen, hasUnread]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {/* Real-time toast banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-100 flex items-start gap-3 rounded-lg border shadow-lg px-4 py-3 max-w-sm animate-in slide-in-from-top-2 duration-300 ${
            PRIORITY_TYPES.has(toast.notification_type)
              ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              : 'bg-background border-border'
          }`}
        >
          <div className="mt-0.5 shrink-0">{getNotificationIcon(toast.notification_type)}</div>
          <div className="flex-1 min-w-0">
            {toast.subject && (
              <p className="text-sm font-semibold truncate">{toast.subject}</p>
            )}
            <p className="text-xs text-muted-foreground line-clamp-2">{toast.content}</p>
          </div>
          <button onClick={dismissToast} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
      )}

      <Popover open={notifOpen} onOpenChange={setNotifOpen}>
        <PopoverTrigger asChild>
          <button
            className={`relative p-2 rounded-full hover:bg-accent text-muted-foreground transition ${className}`}
            aria-label="Vet Notifications"
          >
            {hasUnread ? <BellRing size={20} className="text-red-500" /> : <Bell size={20} />}
            {hasUnread && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
            )}
            {!hasUnread && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center border-2 border-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {notifications.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <ScrollArea className="max-h-80">
            {notifLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <BellRing size={24} className="mb-2" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notif, index) => {
                  const isPriority = PRIORITY_TYPES.has(notif.notification_type);
                  return (
                    <div
                      key={notif.id}
                      className={`flex gap-3 px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 cursor-pointer ${
                        isPriority ? 'bg-red-50 dark:bg-red-950/20' :
                        index === 0 && hasUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getNotificationIcon(notif.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {notif.subject && (
                          <p className="text-sm font-medium truncate">{notif.subject}</p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">{notif.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.sent_at)}</p>
                      </div>
                      {isPriority && (
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold shrink-0">Urgent</span>
                      )}
                      {!isPriority && !notif.is_read && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">New</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setNotifOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
