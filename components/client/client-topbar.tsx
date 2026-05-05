"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/auth-client';
import { ThemeToggle } from './theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Calendar,
  Check,
  CreditCard,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface Notification {
  id: string;
  notification_type: string;
  subject?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ClientTopbarProps {
  profile: any;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  setMobileOpen: (value: boolean) => void;
}

function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/notifications?user_id=${uid}&limit=5`);
      if (!res.ok) return;
      const data = await res.json();
      const notifs: Notification[] = data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchNotifications(user.id);
      }
    };
    init();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('client-topbar-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_logs', filter: `recipient_id=eq.${userId}` },
        () => fetchNotifications(userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!isOpen) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      const width = 340;
      let left = rect.left - width + rect.width;
      if (left < 12) left = 12;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
      setDropdownPos({ top: rect.bottom + 10, left });
    }
    setIsOpen((prev) => !prev);
  };

  const markAsRead = async (id: string, currentIsRead: boolean) => {
    if (!userId) return;
    try {
      await fetch('/api/client/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: id, is_read: !currentIsRead }),
      });
      await fetchNotifications(userId);
    } catch (err) {
      console.error('Failed to mark notification:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment_reminder':
      case 'appointment_update':
      case 'appointment_cancelled':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'payment_received':
      case 'payment_due':
        return <CreditCard className="h-4 w-4 text-emerald-600" />;
      case 'system_alert':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      default:
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-border dark:bg-card/80 dark:text-muted-foreground dark:hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[100] flex max-h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
            style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
          >
            <div className="border-b border-slate-100 px-4 py-3 dark:border-border">
              <p className="text-sm font-semibold text-slate-900 dark:text-foreground">Notifications</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No notifications yet.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-slate-100 p-3 last:border-b-0 dark:border-border ${
                      n.is_read ? 'bg-transparent' : 'bg-blue-50/60 dark:bg-blue-950/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-accent">
                        {getIcon(n.notification_type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800 dark:text-foreground">
                            {n.subject || n.notification_type.replace(/_/g, ' ')}
                          </p>
                          {!n.is_read && (
                            <button
                              onClick={() => markAsRead(n.id, false)}
                              className="rounded p-0.5 text-blue-600 transition hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-muted-foreground">{n.content}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{formatTime(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-2.5 dark:border-border">
              <Link
                href="/client/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ClientTopbar({ profile, collapsed, setCollapsed, setMobileOpen }: ClientTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const pageTitle = useMemo(() => {
    if (pathname.includes('/appointments/history')) return 'Appointment History';
    if (pathname.includes('/appointments/outreach')) return 'Outreach Appointments';
    if (pathname.includes('/appointments/regular')) return 'Regular Appointments';
    if (pathname.includes('/appointments')) return 'Appointments';
    if (pathname.includes('/dashboard')) return 'Overview';
    if (pathname.includes('/pets')) return 'My Pets';
    if (pathname.includes('/products')) return 'Products';
    if (pathname.includes('/services')) return 'Services';
    if (pathname.includes('/transactions')) return 'Transactions';
    if (pathname.includes('/faq')) return 'FAQ';
    if (pathname.includes('/settings')) return 'Settings';
    return 'Client Portal';
  }, [pathname]);

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'Pet Owner';

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-border dark:bg-background/80">
      <div className="flex h-full items-center justify-between px-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:flex dark:border-border dark:bg-card dark:text-muted-foreground"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
          </button>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">PAWS</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{pageTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 transition hover:border-slate-300 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-accent/70"
                aria-label="Open profile menu"
              >
                <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-slate-100 dark:bg-accent">
                    <Image src={profile?.avatar_url || "/images/image.png"} alt="Profile" fill className="object-cover" />
                  </div>
                  <div className="hidden min-w-0 sm:block text-left">
                  <p className="max-w-[140px] truncate text-xs font-semibold text-slate-800 dark:text-foreground">{fullName}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Client</p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block dark:text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2">
              <DropdownMenuLabel className="rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-slate-100 dark:bg-accent">
                      <Image src={profile?.avatar_url || "/images/image.png"} alt="Profile" fill className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">{fullName}</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground">Client account</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl px-3 py-2">
                <Link href="/client/settings" className="flex w-full items-center">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Settings & account</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl px-3 py-2">
                <Link href="/client/faq" className="flex w-full items-center">
                  <HelpCircle className="h-4 w-4" />
                  <span className="font-medium">Help & support</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-xl px-3 py-2"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = `/login?mode=cms&redirect=${encodeURIComponent('/client-admin?tab=clients')}`;
                }}
              >
                <div className="flex w-full items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="font-medium">CMS Admin</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="rounded-xl px-3 py-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
