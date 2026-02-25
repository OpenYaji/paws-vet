'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types/notifications';
import { getNotificationIcon, timeAgo } from '@/lib/notification-utils';

interface NotificationBellProps {
  userId: string;
  className?: string;
}

export function NotificationBell({ userId, className = '' }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  // Track products already notified this session so we don't spam on repeated updates
  const notifiedLowStockRef = useRef<Set<string>>(new Set());
  // Store the first-seen timestamp per product so re-fetches don't reset to "Just now"
  const stockAlertTimestamps = useRef<Map<string, string>>(new Map());

  // Fetch notification_logs + current low-stock products
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setNotifLoading(true);

    try {
      // Run both in parallel
      const [notifRes, { data: prods }] = await Promise.all([
        fetch('/api/notifications'),
        supabase
          .from('products')
          .select('id, product_name, stock_quantity, low_stock_threshold')
          .eq('is_active', true),
      ]);

      const dbNotifs: Notification[] = notifRes.ok ? await notifRes.json() : [];

      // Generate synthetic low-stock notifications for products already in alert state
      const stockAlerts: Notification[] = [];
      for (const p of (prods || [])) {
        const isOos = p.stock_quantity === 0;
        const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;
        if (isOos || isLow) {
          // Preserve the original first-seen timestamp — don't reset to "Just now" on re-fetch
          if (!stockAlertTimestamps.current.has(p.id)) {
            stockAlertTimestamps.current.set(p.id, new Date().toISOString());
          }
          const ts = stockAlertTimestamps.current.get(p.id)!;
          // Pre-populate ref so the WebSocket won't duplicate the same product
          notifiedLowStockRef.current.add(p.id);
          stockAlerts.push({
            id: `low-stock-${p.id}-init`,
            recipient_id: userId,
            notification_type: 'low_stock',
            subject: isOos ? 'Out of Stock' : 'Low Stock Alert',
            content: isOos
              ? `${p.product_name} is now out of stock.`
              : `${p.product_name} is running low — ${p.stock_quantity} unit${p.stock_quantity !== 1 ? 's' : ''} left.`,
            sent_at: ts,
            delivery_status: 'delivered',
            delivery_attempted_at: null,
            delivered_at: ts,
            error_message: null,
            related_entity_type: 'product',
            related_entity_id: p.id,
            created_at: ts,
          });
        } else {
          // Stock is fine — clear stored timestamp so next alert gets a fresh one
          stockAlertTimestamps.current.delete(p.id);
        }
      }

      // Low-stock alerts first, then DB notifications
      const combined = [...stockAlerts, ...dbNotifs].slice(0, 20);
      setNotifications(combined);
      if (combined.length > 0) setHasUnread(true);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  }, [userId]);

  // Fetch on mount so the unread dot appears immediately
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId, fetchNotifications]);

  // Re-fetch when popover opens (refresh to latest state)
  useEffect(() => {
    if (!notifOpen || !userId) return;
    fetchNotifications();
  }, [notifOpen, userId, fetchNotifications]);

  // Listen for new rows in notification_logs via WebSocket
  useEffect(() => {
    if (!userId) return;

    const logsSub = supabase
      .channel('notification-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev].slice(0, 20));
          setHasUnread(true);

          if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
            new Notification(newNotif.subject || 'New Notification', {
              body: newNotif.content,
              icon: '/favicon.ico',
            });
          }
        }
      )
      .subscribe();

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => { logsSub.unsubscribe(); };
  }, [userId]);

  // Listen for low-stock / out-of-stock product changes via WebSocket
  useEffect(() => {
    if (!userId) return;

    const productSub = supabase
      .channel('notification-bell-low-stock')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const p = payload.new as {
            id: string; product_name: string;
            stock_quantity: number; low_stock_threshold: number; is_active: boolean;
          };
          if (!p.is_active) return;

          const isOos      = p.stock_quantity === 0;
          const isLowStock = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;

          if (isOos || isLowStock) {
            if (!notifiedLowStockRef.current.has(p.id)) {
              notifiedLowStockRef.current.add(p.id);
              // Record first-seen timestamp for this alert
              if (!stockAlertTimestamps.current.has(p.id)) {
                stockAlertTimestamps.current.set(p.id, new Date().toISOString());
              }
              const ts = stockAlertTimestamps.current.get(p.id)!;

              const subject = isOos ? 'Out of Stock' : 'Low Stock Alert';
              const content = isOos
                ? `${p.product_name} is now out of stock.`
                : `${p.product_name} is running low — ${p.stock_quantity} unit${p.stock_quantity !== 1 ? 's' : ''} left.`;

              const synthetic: Notification = {
                id: `low-stock-${p.id}-${Date.now()}`,
                recipient_id: userId,
                notification_type: 'low_stock',
                subject,
                content,
                sent_at: ts,
                delivery_status: 'delivered',
                delivery_attempted_at: null,
                delivered_at: ts,
                error_message: null,
                related_entity_type: 'product',
                related_entity_id: p.id,
                created_at: ts,
              };

              setNotifications(prev => [synthetic, ...prev].slice(0, 20));
              setHasUnread(true);

              if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
                new Notification(subject, { body: content, icon: '/favicon.ico' });
              }
            }
          } else {
            // Stock replenished — clear so next drop gets a fresh timestamp and re-notifies
            notifiedLowStockRef.current.delete(p.id);
            stockAlertTimestamps.current.delete(p.id);
          }
        }
      )
      .subscribe();

    return () => { productSub.unsubscribe(); };
  }, [userId]);

  // Mark as read when opened
  useEffect(() => {
    if (notifOpen) setHasUnread(false);
  }, [notifOpen]);

  return (
    <Popover open={notifOpen} onOpenChange={setNotifOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative p-2 rounded-full hover:bg-accent text-muted-foreground transition ${className}`}
          aria-label="Notifications"
        >
          <Bell size={20} />
          {hasUnread && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
          )}
          {!hasUnread && notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center border-2 border-background">
              {notifications.length > 9 ? '9+' : notifications.length}
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
              {notifications.map((notif, index) => (
                <div
                  key={notif.id}
                  className={`flex gap-3 px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 cursor-pointer ${
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
                  {index === 0 && hasUnread && (
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
              onClick={() => setNotifOpen(false)}
            >
              View All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
