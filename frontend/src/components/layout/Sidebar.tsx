import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Home, Upload, Download, Trash2, Settings } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="w-64 min-h-[calc(100vh-3.5rem)] border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4 space-y-2">
        <Button variant="ghost" className="w-full justify-start cursor-pointer">
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>

        <Button variant="ghost" className="w-full justify-start cursor-pointer">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>

        <Button variant="ghost" className="w-full justify-start cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          Downloads
        </Button>

        <Button variant="ghost" className="w-full justify-start cursor-pointer">
          <Trash2 className="mr-2 h-4 w-4" />
          Trash
        </Button>

        <div className="pt-4">
          <Separator className="mb-4" />
          <Button
            variant="ghost"
            className="w-full justify-start cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
    </aside>
  );
}
