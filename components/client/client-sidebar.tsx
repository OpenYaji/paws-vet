"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/auth-client';
import { ThemeToggle } from './theme-toggle';
import {
  LayoutDashboard, Calendar, PawPrint, Wallet, HandPlatter,
  Settings, ShoppingBasket, X, LogOut,
  Bell, Check, Info, Heart,
  Database, Clock, CreditCard, AlertTriangle, HelpCircle,
} from "lucide-react";

// =============================================
// NOTIFICATION BELL
// Dropdown opens below the bell, anchored to
// the bell's actual screen position via
// getBoundingClientRect — NOT fixed top-right.
// =============================================
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
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize user and fetch
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchNotifications(user.id);
      }
    };
    init();
  }, [fetchNotifications]);

  // Real-time: auto-refresh when notification_logs changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('sidebar-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_logs', filter: `recipient_id=eq.${userId}` },
        () => fetchNotifications(userId)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchNotifications]);

  // Toggle open and calculate position from the bell's location
  const handleToggle = () => {
    if (!isOpen && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      // Align left edge of dropdown with left edge of bell
      // but clamp so it doesn't overflow the right side of the screen
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - 16) {
        left = window.innerWidth - dropdownWidth - 16;
      }
      setDropdownPos({ top: rect.bottom + 8, left });
    }
    setIsOpen(prev => !prev);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'payment_received':
      case 'payment_due':
        return <CreditCard className="w-4 h-4 text-green-600" />;
      case 'system_alert':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'appointment_reminder':
      case 'appointment_update': return 'bg-blue-100';
      case 'appointment_cancelled': return 'bg-red-100';
      case 'payment_received': return 'bg-green-100';
      case 'payment_due': return 'bg-yellow-100';
      case 'system_alert': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div ref={bellRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-1.5 hover:bg-accent rounded-lg transition-colors flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown — positioned dynamically below the bell */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[99]" onClick={() => setIsOpen(false)} />

          <div
            className="fixed w-80 bg-white dark:bg-card rounded-xl shadow-2xl border border-gray-200 dark:border-border z-[100] flex flex-col max-h-[480px]"
            style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-foreground">Notifications</h3>
                <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="spinner mx-auto mb-2" />
                  <p className="text-gray-500 text-xs">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-border">
                  {notifications.map((n) => {
                    const isUnread = !n.is_read;
                    return (
                      <div
                        key={n.id}
                        className={`p-3 hover:bg-gray-50 dark:hover:bg-accent transition-colors ${isUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                      >
                        <div className="flex gap-2.5">
                          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${getIconBg(n.notification_type)}`}>
                            {getIcon(n.notification_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className={`text-xs font-medium leading-tight ${isUnread ? 'text-gray-900 dark:text-foreground' : 'text-gray-600 dark:text-muted-foreground'}`}>
                                {n.subject || n.notification_type.replace(/_/g, ' ')}
                              </p>
                              {isUnread && (
                                <button
                                  onClick={() => markAsRead(n.id, false)}
                                  title="Mark as read"
                                  className="flex-shrink-0"
                                >
                                  <Check className="w-3.5 h-3.5 text-blue-500" />
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-muted-foreground mt-0.5 line-clamp-2">
                              {n.content}
                            </p>
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              {formatTime(n.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-border bg-gray-50 dark:bg-accent/50 rounded-b-xl flex-shrink-0">
              <Link
                href="/client/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-xs text-blue-600 hover:text-blue-700 font-medium"
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

// =============================================
// MAIN SIDEBAR
// =============================================
interface NavSettings {
  show_dashboard: boolean;
  show_appointments: boolean;
  show_history: boolean;
  show_pets: boolean;
  show_products: boolean;
  show_services: boolean;
  show_transactions: boolean;
  show_faq: boolean;
  show_settings: boolean;
}

interface ClientSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  profile: any;
  navSettings?: NavSettings;
}

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_SETTING_KEY: Record<string, keyof NavSettings> = {
  'Dashboard':    'show_dashboard',
  'Appointments': 'show_appointments',
  'History':      'show_history',
  'My Pets':      'show_pets',
  'Products':     'show_products',
  'Services':     'show_services',
  'Transactions': 'show_transactions',
  'FAQ':          'show_faq',
  'Settings':     'show_settings',
};

export default function ClientSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, profile, navSettings }: ClientSidebarProps) {
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleConfirmLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // NOTE: "Notifications" is intentionally removed from nav —
  // the bell icon in the header already handles it.
  const menuItems: MenuItem[] = [
    { name: 'Dashboard',    icon: <LayoutDashboard size={20} />, path: '/client/dashboard' },
    { name: 'Appointments', icon: <Calendar size={20} />,        path: '/client/appointments' },
    { name: 'History',      icon: <Clock size={20} />,           path: '/client/appointments/history' },
    { name: 'My Pets',      icon: <PawPrint size={20} />,        path: '/client/pets' },
    { name: 'Products',     icon: <ShoppingBasket size={20} />,  path: '/client/products' },
    { name: 'Services',     icon: <HandPlatter size={20} />,     path: '/client/services' },
    { name: 'Transactions', icon: <Wallet size={20} />,          path: '/client/transactions' },
    { name: 'FAQ',          icon: <HelpCircle size={20} />,      path: '/client/faq' },
    { name: 'Settings',     icon: <Settings size={20} />,        path: '/client/settings' },
    { name: 'Admin CMS',    icon: <Database size={20} />,        path: '/client-admin' },
  ];

  const NavLink = ({ item, isActive, isCollapsed = false, isMobileLink = false }: any) => (
    <li className="relative group list-none">
      <Link
        href={item.path}
        onClick={() => isMobileLink && setMobileOpen(false)}
        className={`flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-primary text-primary-foreground font-semibold shadow-md"
            : "text-foreground hover:bg-accent/60 dark:hover:bg-accent/40"
        } ${isCollapsed ? 'justify-center' : ''}`}
      >
        {item.icon}
        {!isCollapsed && <span className="whitespace-nowrap text-sm">{item.name}</span>}
      </Link>
    </li>
  );

  const SidebarContent = ({ isMobileView = false, profile }: { isMobileView?: boolean; profile: any }) => {
    const isCollapsed = isMobileView ? false : collapsed;

    return (
      <aside className={`h-screen flex flex-col bg-card border-r border-border transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="flex flex-col h-full p-4 overflow-hidden">

          {/* ── PROFILE HEADER ── */}
          <header className={`flex items-center mb-8 gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
            {/* Avatar */}
            <div className="flex-shrink-0 relative w-10 h-10 overflow-hidden rounded-full border-2 border-primary bg-accent shadow-sm">
              <Image
                src={profile?.avatar_url || "/images/image.png"}
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>

            {/* Name & Role */}
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="font-bold text-sm truncate">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'Pet Owner'}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Client Account</span>
              </div>
            )}

            {/* 🔔 Bell & 🌙 Theme Toggle — only when sidebar is expanded and not in mobile view */}
            {!isCollapsed && !isMobileView && (
              <div className="flex items-center gap-1">
                <NotificationBell />
                <ThemeToggle />
              </div>
            )}

            {/* Mobile close button */}
            {isMobileView && (
              <button onClick={() => setMobileOpen(false)} className="ml-auto p-2 hover:bg-accent rounded-lg transition-colors duration-200">
                <X size={20} />
              </button>
            )}
          </header>

          {/* Nav Items */}
          <nav className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex flex-col space-y-1">
              {menuItems.filter(item => {
                const key = NAV_SETTING_KEY[item.name];
                return key && navSettings ? navSettings[key] !== false : true;
              }).map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={pathname === item.path}
                  isCollapsed={isCollapsed}
                  isMobileLink={isMobileView}
                />
              ))}
            </div>

            {/* Logout pinned at bottom */}
            <button
              onClick={() => setLogoutModalOpen(true)}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut size={20} />
              {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
          </nav>
        </div>
      </aside>
    );
  };

  return (
    <>
      <div className="hidden md:block">
        <SidebarContent profile={profile} />
      </div>
      <div className={`md:hidden fixed inset-0 z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent isMobileView={true} profile={profile} />
      </div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card p-6 rounded-2xl border shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Logout</h3>
            <p className="text-muted-foreground mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setLogoutModalOpen(false)} className="px-4 py-2 rounded-xl border hover:bg-accent">Cancel</button>
              <button onClick={handleConfirmLogout} className="px-4 py-2 rounded-xl bg-destructive text-white hover:bg-destructive/90">Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}