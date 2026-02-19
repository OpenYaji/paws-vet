// components/notifications/notification-bell.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type{ Notification } from '@/types/notifications'; //Interfaces
import { getNotificationIcon, timeAgo } from '@/lib/notification-utils';
import { mockNotifications, simulateNewNotification } from '@/mocks/notifications'; //Mocks for development/testing

interface NotificationBellProps {
  userId: string;
  className?: string;
  enableMockSimulation?: boolean; // Enable simulated notifications in dev
}

const USE_MOCK_DATA = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export function NotificationBell({ userId, className = '', enableMockSimulation = false }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFetched, setNotifFetched] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const prevNotificationCountRef = useRef(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setNotifLoading(true);

    if (USE_MOCK_DATA) {
        console.log('📱 Using mock notifications');
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setNotifications(mockNotifications);
        
        // Set initial count and show unread indicator for mock data
        if (prevNotificationCountRef.current === 0) {
          prevNotificationCountRef.current = mockNotifications.length;
          setHasUnread(true); // Show unread indicator initially in dev mode
        }
        
        setNotifLoading(false);
        setNotifFetched(true);
        return;
      }
    
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('recipient_id', userId)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        
        // Check for new notifications
        if (data.length > prevNotificationCountRef.current) {
          setHasUnread(true);
        }
        prevNotificationCountRef.current = data.length;
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotifLoading(false);
      setNotifFetched(true);
    }
  }, [userId]);

  // Fetch when popover opens
  useEffect(() => {
    if (!notifOpen || notifFetched || !userId) return;
    fetchNotifications();
  }, [notifOpen, notifFetched, userId, fetchNotifications]);

  // Load mock data immediately on mount in dev mode
  useEffect(() => {
    if (USE_MOCK_DATA && !notifFetched && userId) {
      fetchNotifications();
    }
  }, [USE_MOCK_DATA, notifFetched, userId, fetchNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId || USE_MOCK_DATA) return;

    const subscription = supabase
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
          console.log('New notification received:', payload);
          
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          setHasUnread(true);
          
          // Browser notification if tab is not visible
          if (document.visibilityState !== 'visible') {
            if (Notification.permission === 'granted') {
              new Notification(newNotification.subject || 'New Notification', {
                body: newNotification.content,
                icon: '/favicon.ico'
              });
            }
          }
        }
      )
      .subscribe();

    // Request permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // Mark as read when opened
  useEffect(() => {
    if (notifOpen) {
      setHasUnread(false);
    }
  }, [notifOpen]);

  // Simulate receiving new notifications in development mode
  useEffect(() => {
    if (!USE_MOCK_DATA || !enableMockSimulation) return;

    console.log('🔔 Mock notification simulation enabled - new notification every 10 seconds');
    
    const interval = setInterval(() => {
      const newNotif = simulateNewNotification();
      console.log('📬 Simulated new notification:', newNotif);
      
      setNotifications(prev => [newNotif, ...prev].slice(0, 20));
      setHasUnread(true);
      
      // Show visual feedback
      if (document.visibilityState !== 'visible') {
        if (Notification.permission === 'granted') {
          new Notification(newNotif.subject || 'New Notification', {
            body: newNotif.content,
            icon: '/favicon.ico'
          });
        }
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [enableMockSimulation]);

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
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">New</span>
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
                // Navigate to notifications page or clear all
                setNotifOpen(false);
              }}
            >
              View All Notifications
            </Button>
          </div>
        )}
        {USE_MOCK_DATA && (
          <div className="p-2 border-t bg-yellow-50 dark:bg-yellow-950/20">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => {
                const newNotif = simulateNewNotification();
                setNotifications(prev => [newNotif, ...prev].slice(0, 20));
                setHasUnread(true);
                console.log('🧪 Manually triggered mock notification:', newNotif);
              }}
            >
              🧪 Simulate New Notification (Dev)
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

