import { Button } from '../ui/button';
import { Folder, Search, Settings, LogOut } from 'lucide-react';
import { Input } from '../ui/input';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeToggle } from '../theme-toggle';

/**
 * Application Header Component
 *
 * Features:
 * - Responsive design with consistent spacing
 * - Logo and branding
 * - Search functionality
 * - Theme toggle and user actions
 * - Proper alignment and visual hierarchy
 */
export function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      logout();
      toast.success('Successfully logged out');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-3 sm:px-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20">
            <Folder className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight">FileDash</span>
          </div>
        </div>

        {/* Search Bar - Center section */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search files and folders..."
              className="pl-10 pr-4 h-10 bg-muted/50 border-border/50 focus:bg-background"
            />
          </div>
        </div>

        {/* Actions - Right section */}
        <div className="flex items-center gap-2">
          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile Search */}
            <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0">
              <Search className="h-3.5 w-3.5" />
              <span className="sr-only">Search</span>
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-8 w-8 p-0"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="sr-only">Settings</span>
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
