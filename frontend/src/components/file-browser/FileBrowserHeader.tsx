import { Badge } from '../ui/badge';

interface FileBrowserHeaderProps {
  fileCount: number;
  isLoading: boolean;
}

/**
 * File Browser Header Component
 * Displays page title and file count with proper spacing and typography
 */
export function FileBrowserHeader({
  fileCount,
  isLoading,
}: FileBrowserHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Files
            </h1>
            {!isLoading && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {fileCount} {fileCount === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Manage and organize your files with ease
          </p>
        </div>
      </div>
    </div>
  );
}
