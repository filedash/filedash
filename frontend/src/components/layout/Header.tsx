import { Button } from '../ui/button';
import { Folder, Search, Settings } from 'lucide-react';
import { Input } from '../ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <Folder className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">FileDash</span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search files..." className="pl-10" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
