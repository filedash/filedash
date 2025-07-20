import { Button } from '../ui/button';
import { Download, Trash2 } from 'lucide-react';

interface FileBrowserSelectionBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

/**
 * File Browser Selection Bar Component
 * Shows selected file count and bulk actions
 */
export function FileBrowserSelectionBar({
  selectedCount,
  onSelectAll,
  onSelectNone,
  onDownload,
  onDelete,
}: FileBrowserSelectionBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/50 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="h-auto p-1 text-xs"
          >
            Select All
          </Button>
          <span className="text-muted-foreground">•</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectNone}
            className="h-auto p-1 text-xs"
          >
            Clear Selection
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
