import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import type { FileItem } from '../../types/file';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  onRename: (from: string, to: string, newName: string) => Promise<void>;
  isRenaming: boolean;
}

export function RenameDialog({
  open,
  onOpenChange,
  file,
  onRename,
  isRenaming,
}: RenameDialogProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes or file changes
  useEffect(() => {
    if (open && file) {
      setNewName(file.name);
      setError(null);
    } else if (!open) {
      setNewName('');
      setError(null);
    }
  }, [open, file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !newName.trim()) {
      setError('Please enter a valid name');
      return;
    }

    if (newName === file.name) {
      setError('Name must be different from current name');
      return;
    }

    // Validate name
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newName)) {
      setError('Name cannot contain: < > : " / \\ | ? *');
      return;
    }

    try {
      // Calculate new path
      const pathParts = file.path.split('/');
      pathParts[pathParts.length - 1] = newName.trim();
      const newPath = pathParts.join('/');

      await onRename(file.path, newPath, newName.trim());
      onOpenChange(false);
    } catch (error) {
      console.error('Rename error:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to rename file'
      );
    }
  };

  const handleClose = () => {
    if (!isRenaming) {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isRenaming) {
      onOpenChange(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>
            Rename {file.is_directory ? 'Folder' : 'File'}
          </DialogTitle>
          <DialogDescription>
            Enter a new name for "{file.name}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              disabled={isRenaming}
              placeholder="Enter new name"
              className="w-full"
              autoFocus
              onFocus={(e) => {
                // Select filename without extension for files
                if (!file.is_directory && file.name.includes('.')) {
                  const lastDotIndex = file.name.lastIndexOf('.');
                  e.target.setSelectionRange(0, lastDotIndex);
                } else {
                  e.target.select();
                }
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isRenaming || !newName.trim() || newName === file.name}
            >
              {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
