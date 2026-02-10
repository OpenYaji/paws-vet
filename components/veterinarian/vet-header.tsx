'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, Bell, User, LogOut, Settings } from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { Input } from '@/components/ui/input'; // Assuming you have shadcn Input, otherwise use standard <input>
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function VetHeader() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState('vet@example.com'); // Placeholder until loaded
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

        {/* --- USER DROPDOWN --- */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent">
              <Avatar className="h-10 w-10 cursor-pointer border-2 border-transparent hover:border-green-500 transition-all">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-green-600 text-white font-bold">
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
            
            <DropdownMenuItem className="cursor-pointer">
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