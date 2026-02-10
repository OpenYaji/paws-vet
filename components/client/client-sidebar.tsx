"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/auth-client';
import {
  LayoutDashboard, Calendar, PawPrint, Wallet, HandPlatter, 
  Settings, ShoppingBasket, Menu, X, LogOut
} from "lucide-react";

// 1. Updated Interface to include profile
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
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/client/dashboard' },
    { name: 'Appointments', icon: <Calendar size={20} />, path: '/client/appointments' },
    { name: 'My Pets', icon: <PawPrint size={20} />, path: '/client/pets' },
    { name: 'Products', icon: <ShoppingBasket size={20} />, path: '/client/products' },
    { name: 'Services', icon: <HandPlatter size={20} />, path: '/client/services' },
    { name: 'Transactions', icon: <Wallet size={20} />, path: '/client/transactions' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/client/settings' },
  ];

  // Internal NavLink Component
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

  // 2. Updated SidebarContent to handle profile
  const SidebarContent = ({ isMobileView = false, profile }: { isMobileView?: boolean, profile: any }) => {
    const isCollapsed = isMobileView ? false : collapsed;

    return (
      <aside className={`h-screen flex flex-col bg-card border-r transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="flex flex-col h-full p-4">
          
          {/* USER PROFILE HEADER */}
          <header className={`flex items-center mb-8 gap-3 relative ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="flex-shrink-0 relative w-10 h-10 overflow-hidden rounded-full border-2 border-primary bg-accent">
               <Image 
                src={profile?.avatar_url || "/images/image.png"} 
                alt="Profile" 
                fill 
                className="object-cover" 
               />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm truncate">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'Pet Owner'}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Client Account</span>
              </div>
            )}

            {isMobileView && (
              <button onClick={() => setMobileOpen(false)} className="ml-auto p-2 hover:bg-accent rounded-lg">
                <X size={20} />
              </button>
            )}
          </header>

          <nav className="flex-1 flex flex-col space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink key={item.name} item={item} isActive={pathname === item.path} isCollapsed={isCollapsed} isMobileLink={isMobileView} />
            ))}
            
            {/* Logout at bottom */}
            <button 
              onClick={() => setLogoutModalOpen(true)}
              className={`flex items-center gap-4 p-3 rounded-xl hover:bg-destructive/10 text-destructive mt-auto ${isCollapsed ? 'justify-center' : ''}`}
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
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />}

      {/* Logout Modal Logic remains the same... */}
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