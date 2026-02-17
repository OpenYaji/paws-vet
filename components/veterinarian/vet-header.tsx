'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, User, LogOut, Settings } from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { useTheme } from '@/components/veterinarian/theme-provider';
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
import { NotificationBell } from '@/components/notifications';

export default function VetHeader() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const { setTheme, isDark } = useTheme();
  const [userEmail, setUserEmail] = useState('vet@example.com');
  const [userId, setUserId] = useState<string>('');
  const router = useRouter();

  // Fetch user
  useEffect(() => {
    async function setupUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || 'vet@example.com');
        setUserId(user.id);
      }
    }
    setupUser();
  }, []);

  // Effect to update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
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
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-50">
      
      {/* LEFT: Search Bar */}
      <div className="relative w-96 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search patients, appointments..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-full bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-4">
        
        {/* Timestamp Display */}
        <div className="hidden lg:block text-sm font-medium text-muted-foreground border-r border-border pr-4 mr-2">
          {currentTime || 'Loading...'}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-accent text-muted-foreground transition"
          title="Toggle Theme"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications - Uses mock data in development mode */}
        <NotificationBell userId={userId} enableMockSimulation={true} />

        {/* USER DROPDOWN */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent">
              <Avatar className="h-10 w-10 cursor-pointer border-2 border-transparent hover:border-primary transition-all">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
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
            
            <DropdownMenuItem className="cursor-pointer"
              onClick={() => router.push('/veterinarian/profile')}>
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