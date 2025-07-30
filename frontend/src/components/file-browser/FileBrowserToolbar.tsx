import { Button } from '../ui/button';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { Upload, RefreshCw, FolderPlus, FolderUp } from 'lucide-react';

interface FileBrowserToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUpload: () => void;
  onUploadFolder: () => void;
  onCreateFolder: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

/**
 * File Browser Toolbar Component
 * Contains view toggle and action buttons with consistent spacing
 */
export function FileBrowserToolbar({
  viewMode,
  onViewModeChange,
  onUpload,
  onUploadFolder,
  onCreateFolder,
  onRefresh,
  isLoading,
}: FileBrowserToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      {/* View Toggle - Left side */}
      <div className="flex items-center">
        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>

      {/* Action Buttons - Right side */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex items-center gap-1 h-8 px-2"
          onClick={onCreateFolder}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">New Folder</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onUpload}
          className="flex items-center gap-1 h-8 px-2"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Upload Files</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onUploadFolder}
          className="flex items-center gap-1 h-8 px-2"
        >
          <FolderUp className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Upload Folder</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1 h-8 px-2"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
          <span className="hidden lg:inline">Refresh</span>
        </Button>
      </div>
    </div>
  );
}
