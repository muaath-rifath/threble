import React, { useState } from 'react';
import { useThemeWithDb } from "@/hooks/use-theme-with-db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Moon, Sun, Monitor, Palette, Check } from 'lucide-react';

interface ProfileDropdownProps {
  user: {
    name: string;
    email: string;
    image?: string;
  };
  onProfile: () => void;
  onSettings: () => void;
  onLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  user,
  onProfile,
  onSettings,
  onLogout,
}) => {
  const { theme, setTheme } = useThemeWithDb();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full glass-button p-0">
          <Avatar className="h-10 w-10 border-2 border-glass-border dark:border-glass-border-dark">
            <AvatarImage src={user.image} alt={user.name} />
            <AvatarFallback className="bg-primary-500/20 text-primary-500">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 glass-card shadow-xl" align="end">
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 border-2 border-glass-border dark:border-glass-border-dark">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="bg-primary-500/20 text-primary-500">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-black dark:text-white">{user.name}</p>
              <p className="text-xs leading-none text-black/60 dark:text-white/60">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-glass-border dark:bg-glass-border-dark" />
        <DropdownMenuGroup className="p-2">
          <DropdownMenuItem 
            onClick={onProfile}
            className="glass-button cursor-pointer p-3 mb-1"
          >
            <User className="mr-3 h-4 w-4" />
            <span className="font-medium">View Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onSettings}
            className="glass-button cursor-pointer p-3 mb-1"
          >
            <Settings className="mr-3 h-4 w-4" />
            <span className="font-medium">Settings</span>
          </DropdownMenuItem>
          
          {/* Theme Section */}
          <div className="glass-card p-2 mt-2 mb-2">
            <div className="flex items-center space-x-2 mb-2">
              <Palette className="h-4 w-4 text-primary-500" />
              <span className="text-sm font-medium text-black dark:text-white">Theme</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleThemeChange('light')}
                className={`p-2 h-auto flex flex-col items-center space-y-1 transition-all duration-200 ${
                  theme === 'light' 
                    ? 'bg-primary-500/20 border border-primary-500/30 text-primary-500 hover:!bg-primary-500/20 hover:!border-primary-500/30 hover:!text-primary-500' 
                    : 'text-black/60 dark:text-white/60 border border-transparent hover:text-black dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span className="text-xs">Light</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleThemeChange('dark')}
                className={`p-2 h-auto flex flex-col items-center space-y-1 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-primary-500/20 border border-primary-500/30 text-primary-500 hover:!bg-primary-500/20 hover:!border-primary-500/30 hover:!text-primary-500' 
                    : 'text-black/60 dark:text-white/60 border border-transparent hover:text-black dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span className="text-xs">Dark</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleThemeChange('system')}
                className={`p-2 h-auto flex flex-col items-center space-y-1 transition-all duration-200 ${
                  theme === 'system' 
                    ? 'bg-primary-500/20 border border-primary-500/30 text-primary-500 hover:!bg-primary-500/20 hover:!border-primary-500/30 hover:!text-primary-500' 
                    : 'text-black/60 dark:text-white/60 border border-transparent hover:text-black dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5'
                }`}
              >
                <Monitor className="h-4 w-4" />
                <span className="text-xs">System</span>
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-glass-border dark:bg-glass-border-dark" />
        <div className="p-2">
          <DropdownMenuItem 
            onClick={onLogout}
            className="glass-button cursor-pointer p-3 text-red-500 hover:bg-red-50/20 dark:hover:bg-red-950/20 focus:bg-red-50/20 dark:focus:bg-red-950/20"
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span className="font-medium">Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;