"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/auth-client';
import {
  LayoutDashboard,
  Users,
  Calendar,
  PawPrint,
  Settings,
  LifeBuoy,
  Package,
  Receipt,
  Menu,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

export default function AdminSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: AdminSidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleConfirmLogout = async () => {
    await supabase.auth.signOut();
    setLogoutModalOpen(false);
    router.push('/login');
  };

  const getIsActive = (item: MenuItem) => {
    if (item.path === '/admin/dashboard') {
      return pathname === item.path;
    }
    return pathname?.startsWith(item.path);
  };

const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin/dashboard' },
    { name: 'Users', icon: <Users size={20} />, path: '/admin/users-management' },
    { name: 'Appointments', icon: <Calendar size={20} />, path: '/admin/appointments' },
    { name: 'Pets', icon: <PawPrint size={20} />, path: '/admin/pets' },
    { name: 'Products', icon: <Package size={20} />, path: '/admin/products' },
    { name: 'Billing & Invoice', icon: <Receipt size={20} />, path: '/admin/billing' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/admin/settings' },
    { name: 'Help Support', icon: <LifeBuoy size={20} />, path: '/admin/help' },
];

  interface NavLinkProps {
    item: MenuItem;
    isActive: boolean;
    isCollapsed?: boolean;
    isMobileLink?: boolean;
  }

  const NavLink = ({ item, isActive, isCollapsed = false, isMobileLink = false }: NavLinkProps) => (
    <li className="relative group">
      <Link
        href={item.path}
        onClick={(e) => {
          if (item.name === 'Logout') {
            e.preventDefault();
            setLogoutModalOpen(true);
          } else if (isMobileLink) {
            setMobileOpen(false);
          }
        }}
        className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
          isActive && item.name !== 'Logout' ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent"
        } ${isCollapsed ? 'justify-center' : ''}`}
      >
        {item.icon}
        {!isCollapsed && (
          <span className="whitespace-nowrap">{item.name}</span>
        )}
      </Link>

      {isCollapsed && (
        <span className="
          absolute left-full top-1/2 -translate-y-1/2 ml-4
          bg-popover text-popover-foreground text-xs font-bold 
          rounded-md p-2 border
          opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 
          transition-all duration-200 ease-in-out
          whitespace-nowrap
          z-10
        ">
          {item.name}
        </span>
      )}
    </li>
  );

  interface SidebarContentProps {
    isMobileView?: boolean;
  }

  const SidebarContent = ({ isMobileView = false }: SidebarContentProps) => {
    const currentCollapsed = isMobileView ? false : collapsed;

    if (isMobileView) {
      return (
        <aside className="h-screen bg-card border-r text-card-foreground flex flex-col w-64 p-4">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Image src="/images/image.png" alt="Logo" width={40} height={40} className="rounded-full" />
              <span className="font-bold text-sm">PAWS Admin</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-accent rounded-lg">
              <X size={20} />
            </button>
          </header>
          <nav className="flex-1 flex flex-col">
            <ul className="space-y-2 flex-1">
              {menuItems.slice(0, -2).map((item) => (
                <NavLink key={item.name} item={item} isActive={getIsActive(item)} isMobileLink={true} />
              ))}
            </ul>
            <ul className="space-y-2 mt-auto">
              {menuItems.slice(-2).map((item) => (
                <NavLink key={item.name} item={item} isActive={getIsActive(item)} isMobileLink={true} />
              ))}
            </ul>
          </nav>
        </aside>
      );
    }

    return (
      <aside className={`h-screen bg-transparent flex flex-col flex-shrink-0 transition-all duration-300 sticky top-0 ${collapsed ? 'w-28' : 'w-72'}`}>
        {collapsed ? (
          <div className="flex flex-col h-full items-center p-3 gap-3">
            <div className="flex flex-col items-center space-y-4 bg-card border p-3 rounded-3xl shadow-lg flex-1 w-full overflow-y-auto">
              <button onClick={() => setCollapsed(false)} className="p-2 hover:bg-accent rounded-full flex-shrink-0">
                <Menu size={20} />
              </button>
              <Image src="/images/image.png" alt="Logo" width={40} height={40} className="rounded-full flex-shrink-0" />
              <div className="w-8 h-[1px] bg-border flex-shrink-0"></div>
              <nav className="flex-1 flex flex-col w-full">
                <ul className="space-y-2 flex-1">
                  {menuItems.slice(0, -2).map((item) => (
                    <NavLink key={item.name} item={item} isActive={getIsActive(item)} isCollapsed={true} />
                  ))}
                </ul>
                <ul className="space-y-2 mt-auto">
                  {menuItems.slice(-2).map((item) => (
                    <NavLink key={item.name} item={item} isActive={getIsActive(item)} isCollapsed={true} />
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full p-3">
            <div className="bg-card border rounded-3xl p-4 flex-1 flex flex-col shadow-lg overflow-y-auto">
              <header className="flex flex-col items-center text-center mb-8 relative flex-shrink-0">
                <button onClick={() => setCollapsed(true)} className="p-2 hover:bg-accent rounded-lg absolute top-0 right-0">
                  <Menu size={20} />
                </button>
                <Image src="/images/image.png" alt="Logo" width={64} height={64} className="rounded-full mb-2" />
                <h2 className="font-bold text-sm leading-tight">PAWS VETERINARY<br />CLINIC</h2>
              </header>
              <nav className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1">
                  {menuItems.slice(0, -2).map((item) => (
                    <NavLink key={item.name} item={item} isActive={getIsActive(item)} />
                  ))}
                </ul>
                <ul className="space-y-2 mt-auto">
                  {menuItems.slice(-2).map((item) => (
                    <NavLink key={item.name} item={item} isActive={getIsActive(item)} />
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        )}
      </aside>
    );
  };

  return (
    <>
      <div className="hidden md:block">
        <SidebarContent />
      </div>
      <div className={`md:hidden fixed inset-0 z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent isMobileView={true} />
      </div>
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}

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
    </>
  );
}
