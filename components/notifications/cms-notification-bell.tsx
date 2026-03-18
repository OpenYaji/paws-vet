'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types/notifications';
import { getNotificationIcon, timeAgo } from '@/lib/notification-utils';
import { useRouter } from 'next/navigation';

// CMS-only notification types relevant to Client-Admin
const CMS_ALLOWED_TYPES = [
  'appointment_booked',
  'pet_added',
  'pet_updated',
  'new_appointment',
  'new_pet',
  'general',
];

interface CmsNotificationBellProps {
  userId: string;
  className?: string;
  viewAllHref?: string;
}

export function CmsNotificationBell({
  userId,
  className = '',
  viewAllHref,
}: CmsNotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setNotifLoading(true);
    try {
      const notifRes = await fetch('/api/client-admin/notifications');
      let dbNotifs: Notification[] = notifRes.ok ? await notifRes.json() : [];

      dbNotifs.sort((a: Notification, b: Notification) => {
        const aHasId = a.related_entity_id ? 1 : 0;
        const bHasId = b.related_entity_id ? 1 : 0;
        if (bHasId !== aHasId) return bHasId - aHasId;
        return new Date(b.created_at ?? b.sent_at ?? 0).getTime() -
               new Date(a.created_at ?? a.sent_at ?? 0).getTime();
      });

      const seen = new Set<string>();
      const deduped = dbNotifs.filter((n: Notification) => {
        // Extract APT number from subject to dedup across notification types
        const aptMatch = n.subject?.match(/APT-\d+-\d+/);
        const key = n.related_entity_id
          ?? (aptMatch ? aptMatch[0] : null)
          ?? n.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const trimmed = deduped.slice(0, 20);
      setNotifications(trimmed);
      setUnreadCount(trimmed.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch CMS notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  }, [userId]);

  // Fetch on mount
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId, fetchNotifications]);

  // Re-fetch when popover opens
  useEffect(() => {
    if (!notifOpen || !userId) return;
    fetchNotifications();
  }, [notifOpen, userId, fetchNotifications]);

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all as read when popover opens
  const handleOpenChange = useCallback(async (open: boolean) => {
    setNotifOpen(open);
    if (open && unreadCount > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);

      if (unreadIds.length > 0) {
        try {
          await supabase
            .from('notification_logs')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .in('id', unreadIds);
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
        }
      }
    }
  }, [unreadCount, notifications]);

  return (
    <Popover open={notifOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={`relative p-2 rounded-full hover:bg-accent text-muted-foreground transition ${className}`}
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-background font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
          align="end"
          className="w-96 p-0 z-[9999]"
          style={{ maxHeight: '480px' }}
        >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
        <ScrollArea className="h-[360px]">
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
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex gap-3 px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 cursor-pointer ${
                    !notif.is_read ? 'bg-blue-50 dark:bg-blue-950/20' : 'opacity-60'
                  }`}
                  onClick={() => {
                    setNotifOpen(false);
                    if (notif.related_entity_type === 'appointment' && notif.related_entity_id) {
                      router.push(`/client-admin/appointments/${notif.related_entity_id}`);
                    } else if (notif.related_entity_type === 'pet' && notif.related_entity_id) {
                      router.push(`/client-admin/pets/${notif.related_entity_id}`);
                    }
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {getNotificationIcon(notif.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {notif.subject && (
                      <p className={`text-sm truncate ${!notif.is_read ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                        {notif.subject}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{notif.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.sent_at || notif.created_at)}</p>
                  </div>
                  {!notif.is_read && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">New</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setNotifOpen(false);
                if (viewAllHref) router.push(viewAllHref);
              }}
            >
              View All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
