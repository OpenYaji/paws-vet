'use client';

import { useState, useEffect } from 'react';
import { Search, Sun, Moon, Bell, User } from 'lucide-react';
import { Input } from '@/components/ui/input'; // Assuming you have shadcn Input, otherwise use standard <input>

export default function VetHeader() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState<string>('');
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

  // Effect to toggle Dark Mode class on the HTML <body>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <header className="h-16 border-b bg-white dark:bg-gray-900 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-50">
      
      {/* LEFT: Search Bar */}
      <div className="relative w-96 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input 
          type="text" 
          placeholder="Search patients, appointments..." 
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-4">
        
        {/* Timestamp Display */}
        <div className="hidden lg:block text-sm font-medium text-gray-500 dark:text-gray-400 border-r pr-4 mr-2">
          {currentTime || 'Loading...'}
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications (Mock) */}
        <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition">
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
        </button>
        
        {/* User Avatar (Optional fallback) */}
        <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs">
          <span>{userName ? userName.charAt(0).toUpperCase() : <User size={16} />}</span>
        </div>

      </div>
    </header>
  );
}