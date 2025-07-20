import { Button } from '../ui/button';
import { FolderPlus, Upload } from 'lucide-react';

interface FileBrowserEmptyStateProps {
  onUpload: () => void;
  onCreateFolder: () => void;
}

/**
 * File Browser Empty State Component
 * Shown when a folder has no files with improved visual design
 */
export function FileBrowserEmptyState({
  onUpload,
  onCreateFolder,
}: FileBrowserEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {/* Icon with background */}
      <div className="relative mb-6">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted border-2 border-dashed border-border">
          <FolderPlus className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 mb-8">
        <h3 className="text-xl font-semibold text-foreground">
          This folder is empty
        </h3>
        <p className="text-muted-foreground max-w-md leading-relaxed">
          Get started by uploading files or creating a new folder to organize
          your content
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="default"
          size="lg"
          onClick={onUpload}
          className="flex items-center gap-2 min-w-[140px]"
        >
          <Upload className="h-4 w-4" />
          Upload Files
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex items-center gap-2 min-w-[140px]"
          onClick={onCreateFolder}
        >
          <FolderPlus className="h-4 w-4" />
          New Folder
        </Button>
      </div>
    </div>
  );
}
