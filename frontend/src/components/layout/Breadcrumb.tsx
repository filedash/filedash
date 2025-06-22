import { ChevronRight, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { getBreadcrumbItems } from '../../utils/file';

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const items = getBreadcrumbItems(path);

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={item.path} className="flex items-center">
          {index > 0 && <ChevronRight className="mx-1 h-4 w-4" />}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(item.path)}
            className={`h-6 px-2 ${
              index === items.length - 1
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {index === 0 ? <Home className="h-3 w-3" /> : item.name}
          </Button>
        </div>
      ))}
    </nav>
  );
}
