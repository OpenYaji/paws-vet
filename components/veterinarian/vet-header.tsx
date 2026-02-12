'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, Bell, User, LogOut, Settings, Calendar, CreditCard, FlaskConical, BellRing, Info, Loader2 } from 'lucide-react';
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

interface Notification {
  id: string
  notification_type: string
  subject: string | null
  content: string
  sent_at: string
  delivery_status: string
}

const notificationIcon: Record<string, React.ReactNode> = {
  appointment_reminder: <Calendar size={16} className="text-blue-500" />,
  appointment_confirmed: <Calendar size={16} className="text-green-500" />,
  appointment_cancelled: <Calendar size={16} className="text-red-500" />,
  test_results: <FlaskConical size={16} className="text-purple-500" />,
  payment_due: <CreditCard size={16} className="text-orange-500" />,
  general: <Info size={16} className="text-gray-500" />,
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function VetHeader() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const { setTheme, isDark } = useTheme();
  const [userEmail, setUserEmail] = useState('vet@example.com');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFetched, setNotifFetched] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setUserEmail(user.email);
      }
    }
    getUser();
  }, []);

  // Fetch notifications when popover opens for the first time
  useEffect(() => {
    if (!notifOpen || notifFetched) return;

    const fetchNotifications = async () => {
      setNotifLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('notification_logs')
          .select('id, notification_type, subject, content, sent_at, delivery_status')
          .eq('recipient_id', user.id)
          .order('sent_at', { ascending: false })
          .limit(20);

        if (!error && data) {
          setNotifications(data);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setNotifLoading(false);
        setNotifFetched(true);
      }
    };

    fetchNotifications();
  }, [notifOpen, notifFetched]);
  // Effect to update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Format: "Mon, Feb 8 • 8:47 PM"
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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

        {/* Notifications */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-full hover:bg-accent text-muted-foreground transition">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background" />
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
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="flex gap-3 px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      <div className="mt-0.5 shrink-0">
                        {notificationIcon[notif.notification_type] || <Info size={16} className="text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {notif.subject && (
                          <p className="text-sm font-medium truncate">{notif.subject}</p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">{notif.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.sent_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* --- USER DROPDOWN --- */}
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
            
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}