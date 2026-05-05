'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
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

const priorityTypes = new Set(['emergency', 'quarantine_alert']);

// SWR Fetcher with Auth
const fetcher = async (url: string) => {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${data.session?.access_token || ''}` }
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
};

export function VetNotificationBell({ userId, className = '' }: VetNotificationBellProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Let SWR handle fetching, caching, and loading states automatically
  const { data: notifications = [], isLoading, mutate } = useSWR<Notification[]>(
    userId ? '/api/veterinarian/notifications' : null,
    fetcher,
    { revalidateOnFocus: false } // prevents unnecessary reads when switching tabs
  );

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  // 2. Real-time WebSocket: Listen and tell SWR to re-fetch when data changes
  useEffect(() => {
    if (!userId) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel(`vet-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs', // adjust if your table name is different
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new as Notification;
          
          // Show Toast
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          setToast(incoming);
          toastTimerRef.current = setTimeout(() => setToast(null), 6000);

          // Browser Notification
          if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
            new Notification(incoming.subject || 'New Notification', {
              body: incoming.content,
              icon: '/favicon.ico',
            });
          }

          // Force SWR to fetch the latest list instantly
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [userId, mutate]);

  // 3. Mark as read logic
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    if (notifOpen && hasUnread) {
      // Mark all as read in DB silently
      fetch('/api/veterinarian/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      }).then(() => {
        // Optimistically update SWR cache to clear the unread dots immediately
        mutate(
          (currentData) => currentData?.map(n => ({ ...n, is_read: true })), 
          false
        );
      });
    }
  }, [notifOpen, hasUnread, mutate]);

  // Sort local data before rendering
  const sortedNotifications = [...notifications].sort((a, b) => {
    const aPriority = priorityTypes.has(a.notification_type) ? 0 : 1;
    const bPriority = priorityTypes.has(b.notification_type) ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime();
  });

  return (
    <>
      {/* Real-time toast banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-100 flex items-start gap-3 rounded-lg border shadow-lg px-4 py-3 max-w-sm animate-in slide-in-from-top-2 duration-300 ${
            priorityTypes.has(toast.notification_type)
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
            {sortedNotifications.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {sortedNotifications.length} notification{sortedNotifications.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sortedNotifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <BellRing size={24} className="mb-2" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div>
                {sortedNotifications.map((notif, index) => {
                  const isPriority = priorityTypes.has(notif.notification_type);
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

          {sortedNotifications.length > 0 && (
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