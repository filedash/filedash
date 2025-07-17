import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Home, Settings } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="w-64 min-h-[calc(100vh-3.5rem)] border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4 space-y-2">
        <Button variant="ghost" className="w-full justify-start cursor-pointer">
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>
      </div>
    </aside>
  );
}
