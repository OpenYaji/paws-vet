"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ThemeToggle } from './theme-toggle';
import {
  ClipboardList,
  LayoutGrid,
  MapPin,
  PawPrint,
  Users,
  Settings,
  X,
  Heart,
  Bell,
} from "lucide-react";

// 1. Updated Interface to include profile
interface ClientAdminSidebarProps {
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
  tab?: string;
}

export default function ClientAdminSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, profile }: ClientAdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const menuItems: MenuItem[] = [
    { name: 'Clients',            icon: <Users size={20} />, path: '/client-admin', tab: 'clients' },
    { name: 'Pets',               icon: <PawPrint size={20} />, path: '/client-admin', tab: 'pets' },
    { name: 'All Appointments',   icon: <LayoutGrid size={20} />, path: '/client-admin', tab: 'appointments' },
    { name: 'Regular Appointments', icon: <ClipboardList size={20} />, path: '/client-admin', tab: 'regular_appointments' },
    { name: 'Outreach Appointments', icon: <MapPin size={20} />, path: '/client-admin', tab: 'outreach_appointments' },
    { name: 'Outreach Programs',  icon: <Heart size={20} />,          path: '/client-admin/outreach' },
    { name: 'Notifications',      icon: <Bell size={20} />, path: '/client-admin', tab: 'notifications' },
    { name: 'Settings',           icon: <Settings size={20} />,       path: '/client-admin/settings' },
  ];

  const activeTab = searchParams.get('tab') || 'clients';

  const isMenuItemActive = (item: MenuItem) => {
    if (item.tab) {
      return pathname === '/client-admin' && activeTab === item.tab;
    }
    return pathname === item.path;
  };

  // Internal NavLink Component
  const NavLink = ({ item, isActive, isCollapsed = false, isMobileLink = false }: any) => {
    const href = item.tab ? `${item.path}?tab=${item.tab}` : item.path;
    return (
    <li className="relative group list-none">
      <Link
        href={href}
        onClick={() => isMobileLink && setMobileOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
          isActive
            ? "border border-primary/20 bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        } ${isCollapsed ? 'justify-center' : ''}`}
      >
        {item.icon}
        {!isCollapsed && <span className="whitespace-nowrap text-sm">{item.name}</span>}
      </Link>
    </li>
    );
  };

  // 2. Updated SidebarContent to handle profile
  const SidebarContent = ({ isMobileView = false, profile }: { isMobileView?: boolean, profile: any }) => {
    const isCollapsed = isMobileView ? false : collapsed;

    return (
      <aside className={`flex h-[calc(100vh-64px)] flex-col border-r border-border/80 bg-card/95 transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="flex flex-col h-full p-4 overflow-hidden">
          
          {/* USER PROFILE HEADER */}
          <header className={`relative mb-8 flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-primary/30 bg-accent shadow-sm">
               <Image 
                src={profile?.avatar_url || "/images/image.png"} 
                alt="Profile" 
                fill 
                className="object-cover" 
               />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="font-bold text-sm truncate">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'CMS Admin'}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-semibold">CMS Admin</span>
              </div>
            )}

            {/* Theme Toggle */}
            {!isCollapsed && !isMobileView && <ThemeToggle />}

            {isMobileView && (
              <button onClick={() => setMobileOpen(false)} className="ml-auto p-2 hover:bg-accent rounded-lg transition-colors duration-200">
                <X size={20} />
              </button>
            )}
          </header>

          <nav className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex flex-col space-y-1">
              {menuItems.map((item) => (
                <NavLink key={item.name} item={item} isActive={isMenuItemActive(item)} isCollapsed={isCollapsed} isMobileLink={isMobileView} />
              ))}
            </div>

            <div className="mt-4 h-10" />
          </nav>
        </div>
      </aside>
    );
  };

  return (
    <>
      <div className="hidden md:fixed md:left-0 md:top-[64px] md:z-30 md:block">
        <SidebarContent profile={profile} />
      </div>
      <div className={`md:hidden fixed inset-0 z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent isMobileView={true} profile={profile} />
      </div>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />}
    </>
  );
}
