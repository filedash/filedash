import { Button } from '../ui/button';
import { Home, Upload, Download, Trash2, Settings } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4 space-y-2">
        <Button variant="ghost" className="w-full justify-start">
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>

        <Button variant="ghost" className="w-full justify-start">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>

        <Button variant="ghost" className="w-full justify-start">
          <Download className="mr-2 h-4 w-4" />
          Downloads
        </Button>

        <Button variant="ghost" className="w-full justify-start">
          <Trash2 className="mr-2 h-4 w-4" />
          Trash
        </Button>

        <div className="pt-4 border-t">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
    </aside>
  );
}
