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
import { FolderPlus, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Create New Folder
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300 text-sm">
            Creating folder at{' '}
            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border">
              {truncatedPath}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-2">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-300 bg-red-50/80 dark:bg-red-500/10 border border-red-200/50 dark:border-red-400/20 rounded-md backdrop-blur-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Folder Name Input */}
          <div className="space-y-3">
            <Label
              htmlFor="folder-name"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1"
            >
              Folder Name
            </Label>
            <div className="relative">
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  if (error) setError(''); // Clear error when user types
                }}
                placeholder="Enter folder name"
                disabled={isCreating}
                autoFocus
                className={cn(
                  'h-10 px-4 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/30 rounded-md text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-400/60 dark:focus:border-blue-400/50 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200',
                  error &&
                    'border-red-400/60 dark:border-red-400/50 focus:border-red-400/80 dark:focus:border-red-400/60'
                )}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
              className="px-4 py-2 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/30 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-white/10 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !folderName.trim()}
              className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600/90 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 backdrop-blur-md border border-blue-500/30 dark:border-blue-400/30 rounded-md text-white font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
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
