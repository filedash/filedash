import { Button } from '../ui/button';
import { Folder, Search, Settings, LogOut } from 'lucide-react';
import { Input } from '../ui/input';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeToggle } from '../theme-toggle';

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
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 sm:px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <span className="font-semibold text-base sm:text-lg">FileDash</span>
        </div>

        {/* Search Bar - Hidden on mobile, shown on larger screens */}
        <div className="hidden sm:flex flex-1 max-w-md mx-4 lg:mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search files..." className="pl-10" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden cursor-pointer"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          <ThemeToggle />

          <Button variant="ghost" size="icon" className="cursor-pointer">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
