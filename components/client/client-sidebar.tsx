"use client"

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/auth-client';
import {
  LayoutDashboard, Calendar, PawPrint, Wallet, HandPlatter,
  Settings, ShoppingBasket, Menu, X, LogOut,
  Bell, Check, CheckCircle, AlertCircle, Info, HelpCircle
} from "lucide-react";

// =============================================
// MOCK NOTIFICATIONS - Edit these freely
// =============================================
interface Notification {
  id: string;
  type: 'appointment' | 'reminder' | 'info' | 'alert';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'appointment',
    title: 'Appointment Confirmed',
    message: 'Your appointment for Buddy on Feb 25, 2026 at 2:00 PM has been confirmed.',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    link: '/client/appointments',
  },
  {
    id: '2',
    type: 'reminder',
    title: 'Upcoming Appointment Reminder',
    message: "Don't forget! You have an appointment tomorrow at 10:00 AM for Ziggy's vaccination.",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    link: '/client/appointments',
  },
  {
    id: '3',
    type: 'info',
    title: 'New Service Available',
    message: "We now offer dental cleaning services! Book an appointment today.",
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '4',
    type: 'alert',
    title: 'Vaccination Due Soon',
    message: "Buddy's rabies vaccination is due in 7 days. Please schedule an appointment.",
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    link: '/client/appointments',
  },
];

// =============================================
// NOTIFICATION BELL (Fixed positioning to escape overflow)
// =============================================
function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      // Position dropdown to the RIGHT of the bell button
      setDropdownPosition({
        top: rect.top + 8, // Slight offset from top of bell
        left: rect.right + 8 // Open to the right of the bell
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'reminder':    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'alert':       return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:            return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'appointment': return 'bg-blue-100';
      case 'reminder':    return 'bg-yellow-100';
      case 'alert':       return 'bg-red-100';
      default:            return 'bg-gray-100';
    }
  };

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24)  return `${hrs}h ago`;
    if (days < 7)  return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (collapsed) return null;

  return (
    <>
      <div ref={bellRef} className="relative">
        {/* Bell Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
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
      </div>

      {/* Fixed Position Dropdown - opens to the RIGHT of sidebar */}
      {isOpen && (
        <div 
          className="fixed w-80 bg-white dark:bg-card rounded-xl shadow-2xl border border-gray-200 dark:border-border z-[100] flex flex-col max-h-[480px]"
          style={{ 
            top: `${dropdownPosition.top}px`, 
            left: `${dropdownPosition.left}px` 
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-border flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-foreground">Notifications</h3>
              <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-border">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-accent transition-colors ${!n.is_read ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                  >
                    <div className="flex gap-2.5">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${getIconBg(n.type)}`}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-medium leading-tight ${!n.is_read ? 'text-gray-900 dark:text-foreground' : 'text-gray-600 dark:text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <button onClick={() => markAsRead(n.id)} title="Mark as read" className="flex-shrink-0">
                              <Check className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">{formatTime(n.created_at)}</span>
                          {n.link && (
                            <a href={n.link} onClick={() => setIsOpen(false)} className="text-[10px] text-blue-600 hover:underline font-medium">
                              View →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-border bg-gray-50 dark:bg-accent/50 rounded-b-xl flex-shrink-0">
            <a
              href="/client/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================
// MAIN SIDEBAR
// =============================================
interface ClientSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  profile: any;
}

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

export default function ClientSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, profile }: ClientSidebarProps) {
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleConfirmLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems: MenuItem[] = [
    { name: 'Dashboard',     icon: <LayoutDashboard size={20} />, path: '/client/dashboard' },
    { name: 'Appointments',  icon: <Calendar size={20} />,        path: '/client/appointments' },
    { name: 'My Pets',       icon: <PawPrint size={20} />,        path: '/client/pets' },
    { name: 'Products',      icon: <ShoppingBasket size={20} />,  path: '/client/products' },
    { name: 'Services',      icon: <HandPlatter size={20} />,     path: '/client/services' },
    { name: 'Transactions',  icon: <Wallet size={20} />,          path: '/client/transactions' },
    { name: 'FAQ',           icon: <HelpCircle size={20} />,      path: '/client/faq' },
    { name: 'Settings',      icon: <Settings size={20} />,        path: '/client/settings' },
  ];

  const NavLink = ({ item, isActive, isCollapsed = false, isMobileLink = false }: any) => (
    <li className="relative group list-none">
      <Link
        href={item.path}
        onClick={() => isMobileLink && setMobileOpen(false)}
        className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
          isActive ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent"
        } ${isCollapsed ? 'justify-center' : ''}`}
      >
        {item.icon}
        {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
      </Link>
    </li>
  );

  const SidebarContent = ({ isMobileView = false, profile }: { isMobileView?: boolean, profile: any }) => {
    const isCollapsed = isMobileView ? false : collapsed;

    return (
      <aside className={`h-screen flex flex-col bg-card border-r transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="flex flex-col h-full p-4 overflow-hidden">

          {/* ── PROFILE HEADER ── */}
          <header className={`flex items-center mb-8 gap-3 relative ${isCollapsed ? 'justify-center' : ''}`}>
            {/* Avatar */}
            <div className="flex-shrink-0 relative w-10 h-10 overflow-hidden rounded-full border-2 border-primary bg-accent">
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

            {/* Notification Bell - Fixed positioned dropdown opens to the right */}
            {!isCollapsed && !isMobileView && (
              <NotificationBell collapsed={isCollapsed} />
            )}

            {/* Mobile close button */}
            {isMobileView && (
              <button onClick={() => setMobileOpen(false)} className="ml-auto p-2 hover:bg-accent rounded-lg">
                <X size={20} />
              </button>
            )}
          </header>

          {/* Nav Items */}
          <nav className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex flex-col space-y-2">
              {menuItems.map((item) => (
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
              className={`flex items-center gap-4 p-3 rounded-xl hover:bg-destructive/10 text-destructive ${isCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut size={20} />
              {!isCollapsed && <span>Logout</span>}
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