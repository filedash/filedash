import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FolderPlus, Loader2 } from 'lucide-react';
import { getCreateFolderDisplayPath } from '@/utils/pathTruncation';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (folderName: string) => void;
  currentPath: string;
  isCreating?: boolean;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreateFolder,
  currentPath,
  isCreating = false,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate folder name
    const trimmedName = folderName.trim();
    if (!trimmedName) {
      setError('Folder name is required');
      return;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      setError('Folder name contains invalid characters');
      return;
    }

    // Check for reserved names
    const reservedNames = [
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM2',
      'COM3',
      'COM4',
      'COM5',
      'COM6',
      'COM7',
      'COM8',
      'COM9',
      'LPT1',
      'LPT2',
      'LPT3',
      'LPT4',
      'LPT5',
      'LPT6',
      'LPT7',
      'LPT8',
      'LPT9',
    ];
    if (reservedNames.includes(trimmedName.toUpperCase())) {
      setError('This folder name is reserved and cannot be used');
      return;
    }

    setError('');
    onCreateFolder(trimmedName);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFolderName('');
      setError('');
    }
    onOpenChange(open);
  };

  const truncatedPath = getCreateFolderDisplayPath(currentPath, 'small');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Creating folder at "{truncatedPath}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              type="text"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                if (error) setError(''); // Clear error when user types
              }}
              placeholder="Enter folder name"
              disabled={isCreating}
              autoFocus
              className="w-full"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !folderName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create Folder
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
