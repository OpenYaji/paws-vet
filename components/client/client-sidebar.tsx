"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/auth-client';
import {
  LayoutDashboard, Calendar, PawPrint, Wallet, HandPlatter,
  Settings, ShoppingBasket, X, LogOut,
  Database, Clock, HelpCircle,
} from "lucide-react";

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

  const isItemActive = (itemPath: string) => {
    if (itemPath === '/client/dashboard') return pathname === itemPath;
    return pathname.startsWith(itemPath);
  };

  const NavLink = ({ item, isCollapsed = false, isMobileLink = false }: any) => (
    <li className="relative group list-none">
      <Link
        href={item.path}
        onClick={() => isMobileLink && setMobileOpen(false)}
        title={isCollapsed ? item.name : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
          isItemActive(item.path)
            ? "bg-slate-900 text-white shadow-sm dark:bg-primary dark:text-primary-foreground"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
        } ${isCollapsed ? 'justify-center' : ''}`}
      >
        <span className="shrink-0">{item.icon}</span>
        {!isCollapsed && <span className="whitespace-nowrap font-medium">{item.name}</span>}
      </Link>
    </li>
  );

  const SidebarContent = ({ isMobileView = false, profile }: { isMobileView?: boolean; profile: any }) => {
    const isCollapsed = isMobileView ? false : collapsed;

    return (
      <aside
        className={`flex h-full flex-col overflow-hidden border-r border-slate-200/70 bg-white/90 transition-all duration-300 dark:border-border dark:bg-card/90 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex h-full flex-col px-3 py-4 md:px-4 md:py-5">

          <header className={`mb-6 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-border dark:bg-accent">
              <Image
                src={profile?.avatar_url || "/images/image.png"}
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'Pet Owner'}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Client Account</p>
              </div>
            )}

            {isMobileView && (
              <button
                onClick={() => setMobileOpen(false)}
                className="ml-auto rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-accent"
              >
                <X size={20} />
              </button>
            )}
          </header>

          <nav className="flex min-h-0 flex-1 flex-col justify-between">
            <div className="space-y-1.5">
              {menuItems.filter((item) => {
                const key = NAV_SETTING_KEY[item.name];
                return key && navSettings ? navSettings[key] !== false : true;
              }).map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isCollapsed={isCollapsed}
                  isMobileLink={isMobileView}
                />
              ))}
            </div>

            <button
              onClick={() => setLogoutModalOpen(true)}
              className={`mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/20 ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut size={20} />
              {!isCollapsed && <span className="font-medium">Logout</span>}
            </button>
          </nav>
        </div>
      </aside>
    );
  };

  return (
    <>
      <div className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-64px)] md:block">
        <SidebarContent profile={profile} />
      </div>

      <div className={`fixed inset-0 z-40 transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent isMobileView={true} profile={profile} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] md:hidden" onClick={() => setMobileOpen(false)} />
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