'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, Bell, User, LogOut, Settings, BellRing, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { useTheme } from '@/components/veterinarian/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Notification } from '@/types/notifications';
import { 
  getNotificationIcon, 
  timeAgo, 
  getNotificationTitle 
} from '@/lib/notification-utils';

export default function VetHeader() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const { setTheme, isDark } = useTheme();
  const [userEmail, setUserEmail] = useState('vet@example.com');
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFetched, setNotifFetched] = useState(false);
  const [hasUnread, setHasUnread] = useState(false); // For red dot indicator
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const router = useRouter();
  
  // Ref to track the latest notification count for comparison
  const prevNotificationCountRef = useRef(0);

  // Fetch user and setup real-time subscription
  useEffect(() => {
    async function setupUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || 'vet@example.com');
        setUserId(user.id);
      }
    }
    setupUser();
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setNotifLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('id, notification_type, subject, content, sent_at, delivery_status, related_entity_type, related_entity_id, recipient_id, delivery_attempted_at, delivered_at, error_message, created_at')
        .eq('recipient_id', userId)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        
        // Update unread status based on new notifications
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

  // Fetch notifications when popover opens
  useEffect(() => {
    if (!notifOpen || notifFetched || !userId) return;
    fetchNotifications();
  }, [notifOpen, notifFetched, userId, fetchNotifications]);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    // Subscribe to new notifications for this user
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
          
          // Add the new notification to the list
          const newNotification = payload.new as Notification;
          
          // Update notifications state (add to top)
          setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          
          // Show red dot indicator
          setHasUnread(true);
          
          // Optional: Play a sound or show browser notification
          if (document.visibilityState !== 'visible') {
            // If tab is not visible, show browser notification
            if (Notification.permission === 'granted') {
              new Notification('New Notification', {
                body: newNotification.content || 'You have a new notification',
                icon: '/favicon.ico'
              });
            }
          }
        }
      )
      .subscribe();

    // Request notification permission if needed
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // Effect to update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric',
        hour12: true 
      };
      setCurrentTime(now.toLocaleString('en-US', options));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mark notifications as read when popover opens
  useEffect(() => {
    if (notifOpen) {
      setHasUnread(false);
    }
  }, [notifOpen]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleConfirmLogout = async () => {
    try {
      await supabase.auth.signOut();
      setLogoutModalOpen(false);
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-50">
      
      {/* LEFT: Search Bar */}
      <div className="relative w-96 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search patients, appointments..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-full bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-4">
        
        {/* Timestamp Display */}
        <div className="hidden lg:block text-sm font-medium text-muted-foreground border-r border-border pr-4 mr-2">
          {currentTime || 'Loading...'}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-accent text-muted-foreground transition"
          title="Toggle Theme"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications with Red Dot */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-full hover:bg-accent text-muted-foreground transition">
              <Bell size={20} />
              {/* Red dot indicator for unread notifications */}
              {hasUnread && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
              )}
              {/* Also show count if you prefer number badge */}
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
                      {/* New indicator for the latest notification */}
                      {index === 0 && hasUnread && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">New</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* USER DROPDOWN (unchanged) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent">
              <Avatar className="h-10 w-10 cursor-pointer border-2 border-transparent hover:border-primary transition-all">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  <User size={20} />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Veterinarian Account</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="cursor-pointer"
              onClick={() => router.push('/veterinarian/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
            {isLogoutModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
                  <h3 className="text-lg font-bold mb-2">Confirm Logout</h3>
                  <p className="text-muted-foreground mb-4">Are you sure you want to logout?</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setLogoutModalOpen(false)}
                      className="px-4 py-2 rounded-md border hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmLogout}
                      className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}