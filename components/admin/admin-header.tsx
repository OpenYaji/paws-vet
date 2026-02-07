"use client"

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Menu, Search, Sun, Moon, User, ArrowLeft, ArrowRight, Bell } from 'lucide-react';
import { supabase } from '@/lib/auth-client';

interface AdminHeaderProps {
  setMobileOpen: (open: boolean) => void;
  user: any;
}

interface SearchRoute {
  name: string;
  path: string;
  keywords: string[];
}

const Tooltip = ({ text }: { text: string }) => (
  <span className="
    absolute top-full left-1/2 -translate-x-1/2 mt-2
    bg-gray-900 text-white text-xs font-bold 
    rounded-md px-2 py-1 
    opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 
    transition-all duration-300 ease-in-out
    whitespace-nowrap z-50
  ">
    {text}
  </span>
);

export default function AdminHeader({ setMobileOpen, user }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchRoute[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Define searchable routes
  const searchableRoutes: SearchRoute[] = [
    { name: 'Dashboard', path: '/admin/dashboard', keywords: ['home', 'main', 'overview'] },
    { name: 'Users', path: '/admin/users-management', keywords: ['users', 'accounts', 'staff', 'clients'] },
    { name: 'Appointments', path: '/admin/appointments', keywords: ['appointments', 'bookings', 'schedule'] },
    { name: 'Pets', path: '/admin/pets', keywords: ['pets', 'animals', 'patients'] },
    { name: 'Products', path: '/admin/products', keywords: ['products', 'inventory', 'items'] },
    { name: 'Billing & Invoice', path: '/admin/billing', keywords: ['billing', 'invoice', 'payment'] },
    { name: 'Settings', path: '/admin/settings', keywords: ['settings', 'preferences', 'configuration'] },
    { name: 'Help & Support', path: '/admin/help', keywords: ['help', 'support', 'assistance'] },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown === 'profile' && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = searchableRoutes.filter(route => {
      const nameMatch = route.name.toLowerCase().includes(query);
      const keywordMatch = route.keywords.some(keyword => keyword.includes(query));
      return nameMatch || keywordMatch;
    });

    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, [searchQuery]);

  const handleSearchSelect = (path: string) => {
    router.push(path);
    setSearchQuery('');
    setShowSearchResults(false);
    setIsMobileSearchOpen(false);
  };

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  if (!user) {
    return (
      <header className='sticky top-0 z-30 w-full bg-card border-b py-4 flex items-center justify-between animate-pulse'>
        <div className="h-8 bg-muted rounded w-1/4 ml-6"></div>
        <div className="h-10 bg-muted rounded w-1/4 mr-6"></div>
      </header>
    );
  }

  return (
    <header className='sticky top-0 z-30 w-full bg-card border-b py-4 flex items-center justify-between'>
      {/*Mobile Search View */}
      {isMobileSearchOpen && (
        <div className="absolute inset-0 bg-card w-full flex items-center px-4 z-40 sm:hidden">
          <button onClick={() => setIsMobileSearchOpen(false)} className="mr-2 text-muted-foreground">
            <ArrowLeft size={24} />
          </button>
          <div className='relative flex-1' ref={searchRef}>
            <input
              type='text'
              placeholder='Search pages...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring'
              autoFocus
            />
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground' />

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-lg shadow-xl border max-h-64 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(result.path)}
                    className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between group"
                  >
                    <span className="text-sm">{result.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center flex-1">
        <div className="relative group pl-6 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
          <Tooltip text="Open menu" />
        </div>

        <div className='hidden sm:block flex-1 max-w-sm md:pl-6'>
          <div className='relative' ref={searchRef}>
            <input
              type='text'
              placeholder='Search pages...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring'
            />
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground' />

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-lg shadow-xl border max-h-64 overflow-y-auto z-50">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(result.path)}
                    className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between group"
                  >
                    <span className="text-sm">{result.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='flex items-center gap-4 ml-4 pr-6'>
        <div className='hidden sm:flex items-center gap-2 text-sm text-muted-foreground'>
          <span>{formattedDate}</span>
          <span>-</span>
          <span>{formattedTime}</span>
        </div>

        <div className="relative group sm:hidden">
          <button onClick={() => setIsMobileSearchOpen(true)} className="p-2 hover:bg-accent rounded-full transition-colors">
            <Search className='w-5 h-5 text-muted-foreground' />
          </button>
          <Tooltip text="Search" />
        </div>

        <div className="relative group">
          <button onClick={toggleTheme} className='p-2 hover:bg-accent rounded-full transition-colors'>
            {theme === 'dark' ? <Sun className='w-5 h-5 text-yellow-400' /> : <Moon className='w-5 h-5' />}
          </button>
          <Tooltip text={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} />
        </div>

        <div className="relative group">
          <button className='p-2 hover:bg-accent rounded-full transition-colors relative'>
            <Bell className='w-5 h-5 text-muted-foreground' />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
          </button>
          <Tooltip text="Notifications" />
        </div>

        <div className="relative group" ref={profileRef}>
          <button onClick={() => toggleDropdown('profile')} className='flex items-center gap-2 cursor-pointer'>
            <div className='w-10 h-10 rounded-full bg-muted overflow-hidden'>
              <Image
                src="/images/image.png"
                alt='Admin'
                width={40}
                height={40}
                className='w-full h-full object-cover'
              />
            </div>
            <div className='hidden md:block'>
              <p className='text-sm font-semibold'>{user.email?.split('@')[0]}</p>
              <p className='text-xs text-muted-foreground'>Admin</p>
            </div>
          </button>
          {openDropdown !== 'profile' && <Tooltip text="My Account" />}
          {openDropdown === 'profile' && (
            <div className="absolute right-0 mt-2 w-48 bg-popover rounded-lg shadow-xl border animate-fade-in-down">
              <ul className="py-2">
                <li className="relative group/item">
                  <Link
                    href="/admin/settings"
                    onClick={() => setOpenDropdown(null)}
                    className="w-full text-left px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-3"
                  >
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-sm">My Account</span>
                  </Link>
                </li>
                <li className="relative group/item">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-3 text-destructive"
                  >
                    <ArrowLeft size={16} />
                    <span className="text-sm">Logout</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
