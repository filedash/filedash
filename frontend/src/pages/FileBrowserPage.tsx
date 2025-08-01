import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

// Hooks
import { useFileBrowser } from '../hooks/useFileBrowser';

// Components
import { FileListView } from '../components/file-browser/FileListView';
import { FileGridView } from '../components/file-browser/FileGridView';
import { FileBrowserToolbar } from '../components/file-browser/FileBrowserToolbar';
import { FileDashBreadcrumb } from '../components/layout/Breadcrumb';
import { FileBrowserEmptyState } from '../components/file-browser/FileBrowserEmptyState';
import { FileBrowserSelectionBar } from '../components/file-browser/FileBrowserSelectionBar';
import { CreateFolderDialog } from '../components/file-browser/CreateFolderDialog';
import { RenameDialog } from '../components/file-browser/RenameDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';

// UI Components
import { Card } from '../components/ui/card';

// Services
import { fileService } from '../services/fileService';

// Types
import type { FileItem, ViewMode, SortField } from '../types/file';

// Utils
import { downloadFile } from '../utils/file-operations';

/**
 * Main File Browser Page Component
 *
 * Features:
 * - Grid/List view toggle with grid as default
 * - Blue folder icons
 * - Modular file icon system
 * - Responsive design
 * - File operations (upload, download, delete, rename)
 * - Context menus and keyboard shortcuts
 */
export function FileBrowserPage() {
  // Local state for UI controls
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  /**
   * File download handler with toast notifications
   */
  const handleDownload = useCallback(async (file: FileItem) => {
    try {
      await toast.promise(downloadFile(file, fileService), {
        loading: `Downloading ${file.name}...`,
        success: `Downloaded ${file.name}`,
        error: `Failed to download ${file.name}`,
      });
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, []);

  // File browser hook with all the business logic
  const {
    currentPath,
    files,
    selectedFiles,
    viewMode,
    sortField,
    sortDirection,
    isLoading,
    error,
    navigateToPath,
    handleFileClick,
    handleFileSelect,
    selectAll,
    selectNone,
    setViewMode,
    setSortField,
    setSortDirection,
    refresh,
    deleteFiles,
  } = useFileBrowser('/', handleDownload);

  /**
   * File upload handler with progress and validation
   */
  const handleUpload = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return;

      const fileArray = Array.from(files);
      const fileNames = fileArray.map((f) => f.name).join(', ');

      console.log('Uploading files:', {
        fileCount: fileArray.length,
        fileNames,
        currentPath,
        files: fileArray.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
      });

      // For large number of files, show progress feedback
      if (fileArray.length > 10) {
        let progressToastId: string | number | undefined;
        
        try {
          const result = await new Promise<any>((resolve, reject) => {
            // Show initial progress toast
            progressToastId = toast.loading(`Uploading ${fileArray.length} files... (0%)`, {
              duration: Infinity,
            });

            fileService.uploadFiles(fileArray, currentPath, (progress) => {
              // Update the progress toast
              if (progressToastId) {
                toast.loading(`Uploading ${fileArray.length} files... (${progress}%)`, {
                  id: progressToastId,
                  duration: Infinity,
                });
              }
            }).then(resolve).catch(reject);
          });

          // Dismiss the progress toast
          if (progressToastId) {
            toast.dismiss(progressToastId);
          }

          // Show success toast with details
          const successMessage = result.errors.length > 0 
            ? `Uploaded ${result.uploaded.length} of ${fileArray.length} files. ${result.errors.length} files failed.`
            : `Successfully uploaded ${result.uploaded.length} files.`;

          if (result.errors.length > 0) {
            toast.warning(successMessage, { duration: 8000 });
            console.warn('Upload errors:', result.errors);
          } else {
            toast.success(successMessage, { duration: 5000 });
          }

          refresh();
        } catch (error) {
          // Dismiss the progress toast on error
          if (progressToastId) {
            toast.dismiss(progressToastId);
          }
          
          console.error('Upload error:', error);
          toast.error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`, {
            duration: 8000
          });
        }
      } else {
        // For small number of files, use the simple toast promise
        try {
          await toast.promise(fileService.uploadFiles(fileArray, currentPath), {
            loading: `Uploading ${fileArray.length} file${
              fileArray.length > 1 ? 's' : ''
            }...`,
            success: (result) => {
              refresh();
              return `Successfully uploaded ${result.uploaded.length} file${
                result.uploaded.length > 1 ? 's' : ''
              }`;
            },
            error: (error) => {
              console.error('Upload error:', error);
              return `Failed to upload files: ${
                error.message || 'Unknown error'
              }`;
            },
          });
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }
    },
    [currentPath, refresh]
  );

  /**
   * Folder upload handler with progress and validation
   */
  const handleFolderUpload = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return;

      const fileArray = Array.from(files);
      const folderNames = [...new Set(fileArray.map(f => {
        const webkitPath = (f as any).webkitRelativePath || f.name;
        return webkitPath.split('/')[0];
      }))];

      console.log('Uploading folder:', {
        fileCount: fileArray.length,
        folderNames,
        currentPath,
        files: fileArray.map((f) => ({
          name: f.name,
          webkitRelativePath: (f as any).webkitRelativePath,
          size: f.size,
          type: f.type,
        })),
      });

      let progressToastId: string | number | undefined;
      const startTime = Date.now();
      let lastUpdateTime = startTime;
      let lastProcessedFiles = 0;
      
      try {
        const result = await new Promise<any>((resolve, reject) => {
          // Show initial progress toast
          progressToastId = toast.loading(`Uploading folder with ${fileArray.length} files... (0%) - Initializing...`, {
            duration: Infinity,
          });

          fileService.uploadFolder(fileArray, currentPath, (progress, currentFileName) => {
            const currentTime = Date.now();
            const elapsedTime = (currentTime - startTime) / 1000; // seconds
            const currentProcessedFiles = Math.round((progress / 100) * fileArray.length);
            
            // Calculate speed metrics
            let speedInfo = '';
            let currentFileInfo = '';
            
            if (currentFileName) {
              // Extract just the filename from the full path for display
              const displayName = currentFileName.includes('/') 
                ? currentFileName.split('/').pop() 
                : currentFileName;
              currentFileInfo = `\nCurrently: ${displayName}`;
            }
            
            if (elapsedTime > 5) { // Only show speed after 5 seconds for accuracy
              const filesPerSecond = currentProcessedFiles / elapsedTime;
              const filesRemaining = fileArray.length - currentProcessedFiles;
              const estimatedTimeRemaining = filesRemaining / filesPerSecond;
              
              if (currentTime - lastUpdateTime > 2000) { // Update speed every 2 seconds
                const recentFilesProcessed = currentProcessedFiles - lastProcessedFiles;
                const recentTimeElapsed = (currentTime - lastUpdateTime) / 1000;
                const recentSpeed = recentFilesProcessed / recentTimeElapsed;
                
                speedInfo = ` - ${recentSpeed.toFixed(1)} files/sec - ~${Math.round(estimatedTimeRemaining / 60)}min remaining`;
                lastUpdateTime = currentTime;
                lastProcessedFiles = currentProcessedFiles;
              }
            }
            
            // Update the progress toast with current file information
            if (progressToastId) {
              toast.loading(`Uploading folder with ${fileArray.length} files... (${progress}%)${speedInfo}${currentFileInfo}`, {
                id: progressToastId,
                duration: Infinity,
              });
            }
          }).then(resolve).catch(reject);
        });

        // Dismiss the progress toast
        if (progressToastId) {
          toast.dismiss(progressToastId);
        }

        const totalTime = (Date.now() - startTime) / 1000;
        const avgSpeed = result.successful_files / totalTime;

        // Show success toast with performance metrics
        const successMessage = result.failed_files > 0 
          ? `Uploaded ${result.successful_files} of ${result.total_files} files in ${Math.round(totalTime)}s (${avgSpeed.toFixed(1)} files/sec). Created ${result.folders_created.length} folder${result.folders_created.length !== 1 ? 's' : ''}. ${result.failed_files} files failed.`
          : `Successfully uploaded ${result.successful_files} files in ${Math.round(totalTime)}s (${avgSpeed.toFixed(1)} files/sec). Created ${result.folders_created.length} folder${result.folders_created.length !== 1 ? 's' : ''}.`;

        if (result.failed_files > 0) {
          toast.warning(successMessage, { duration: 10000 });
          
          // Log failed files for debugging
          console.warn('Failed files:', result.failed);
        } else {
          toast.success(successMessage, { duration: 8000 });
        }

        refresh();
      } catch (error) {
        // Dismiss the progress toast on error
        if (progressToastId) {
          toast.dismiss(progressToastId);
        }
        
        console.error('Folder upload error:', error);
        toast.error(`Failed to upload folder: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          duration: 8000
        });
      }
    },
    [currentPath, refresh]
  );

  /**
   * Folder creation handler
   */
  const handleCreateFolder = useCallback(
    async (folderName: string) => {
      setIsCreatingFolder(true);
      try {
        await toast.promise(fileService.createFolder(currentPath, folderName), {
          loading: `Creating folder "${folderName}"...`,
          success: (result) => {
            console.log('Folder created:', result);
            setCreateFolderDialogOpen(false);
            refresh();
            return `Successfully created folder "${folderName}"`;
          },
          error: (error) => {
            console.error('Create folder error:', error);
            return `Failed to create folder: ${
              error.message || 'Unknown error'
            }`;
          },
        });
      } catch (error) {
        console.error('Create folder failed:', error);
      } finally {
        setIsCreatingFolder(false);
      }
    },
    [currentPath, refresh]
  );

  /**
   * File rename handler
   */
  const handleRename = useCallback((file: FileItem) => {
    setFileToRename(file);
    setRenameDialogOpen(true);
  }, []);

  const handleRenameConfirm = useCallback(
    async (from: string, to: string, newName: string) => {
      setIsRenaming(true);
      try {
        await toast.promise(fileService.renameFile(from, to), {
          loading: `Renaming to "${newName}"...`,
          success: (result) => {
            console.log('File renamed:', result);
            refresh();
            return `Successfully renamed to "${newName}"`;
          },
          error: (error) => {
            console.error('Rename error:', error);
            return `Failed to rename: ${error.message || 'Unknown error'}`;
          },
        });
      } catch (error) {
        console.error('Rename failed:', error);
        throw error; // Re-throw so the dialog can handle it
      } finally {
        setIsRenaming(false);
      }
    },
    [refresh]
  );

  /**
   * Trigger file input for uploads
   */
  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Trigger folder input for uploads
   */
  const triggerFolderUpload = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  /**
   * Handle multiple file selection operations
   */
  const handleBulkDownload = useCallback(async () => {
    const selectedFileObjects = files.filter((file) =>
      selectedFiles.includes(file.path)
    );

    for (const file of selectedFileObjects) {
      if (!file.is_directory) {
        await handleDownload(file);
      }
    }
  }, [files, selectedFiles, handleDownload]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.info('No files selected for deletion');
      return;
    }

    const fileNames = selectedFiles.map(path => {
      const file = files.find(f => f.path === path);
      return file?.name || path.split('/').pop() || path;
    }).join(', ');

    try {
      await toast.promise(deleteFiles(selectedFiles), {
        loading: `Deleting ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}...`,
        success: `Successfully deleted: ${fileNames}`,
        error: `Failed to delete files`,
      });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }, [selectedFiles, files, deleteFiles]);

  const handleDeleteFile = useCallback(async (file: FileItem) => {
    try {
      await toast.promise(deleteFiles([file.path]), {
        loading: `Deleting ${file.name}...`,
        success: `Successfully deleted ${file.name}`,
        error: `Failed to delete ${file.name}`,
      });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }, [deleteFiles]);

  /**
   * Handle sorting with proper types
   */
  const handleSort = useCallback(
    (field: string) => {
      const fieldAsSortField = field as SortField;
      setSortField((prev) => {
        if (prev === fieldAsSortField) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
          return prev;
        } else {
          setSortDirection('asc');
          return fieldAsSortField;
        }
      });
    },
    [sortDirection, setSortField, setSortDirection]
  );

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load files"
        message={
          error instanceof Error ? error.message : 'An unknown error occurred'
        }
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="space-y-1">
      {/* Breadcrumb Navigation - Minimal padding */}
      <div className="px-2 py-1">
        <FileDashBreadcrumb
          path={currentPath}
          onNavigate={navigateToPath}
          availableSpace="large"
        />
      </div>

      {/* Selection Actions Bar - Show at top when files are selected */}
      {selectedFiles.length > 0 && (
        <div className="px-2">
          <FileBrowserSelectionBar
            selectedCount={selectedFiles.length}
            onSelectAll={selectAll}
            onSelectNone={selectNone}
            onDownload={handleBulkDownload}
            onDelete={handleBulkDelete}
          />
        </div>
      )}

      {/* Main File Browser - Full Width with minimal padding */}
      <Card className="border-border/40 shadow-sm overflow-hidden rounded-lg bg-primary">
        {/* Compact Toolbar Header */}
        <div className="border-b border-border/40 bg-muted/20">
          <div className="px-2 py-1.5">
            <FileBrowserToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onUpload={triggerUpload}
              onUploadFolder={triggerFolderUpload}
              onCreateFolder={() => setCreateFolderDialogOpen(true)}
              onRefresh={refresh}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Main Content Area - No Extra Padding */}
        <div className="bg-background">
          {isLoading ? (
            <div className="p-6">
              <LoadingSpinner message="Loading files..." />
            </div>
          ) : files.length === 0 ? (
            <FileBrowserEmptyState
              onUpload={triggerUpload}
              onUploadFolder={triggerFolderUpload}
              onCreateFolder={() => setCreateFolderDialogOpen(true)}
            />
          ) : (
            <FileBrowserContent
              files={files}
              viewMode={viewMode}
              selectedFiles={selectedFiles}
              sortField={sortField}
              sortDirection={sortDirection}
              onFileClick={handleFileClick}
              onFileSelect={handleFileSelect}
              onDownload={handleDownload}
              onRename={handleRename}
              onDelete={handleDeleteFile}
              onSort={handleSort}
            />
          )}
        </div>
      </Card>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) {
            handleUpload(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden folder input for folder uploads */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore - webkitdirectory is not in the standard types
        webkitdirectory=""
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) {
            handleFolderUpload(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        onCreateFolder={handleCreateFolder}
        currentPath={currentPath}
        isCreating={isCreatingFolder}
      />

      {/* Rename Dialog */}
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        file={fileToRename}
        onRename={handleRenameConfirm}
        isRenaming={isRenaming}
      />
    </div>
  );
}

/**
 * File Browser Content Component
 * Renders either grid or list view based on viewMode
 */
interface FileBrowserContentProps {
  files: FileItem[];
  viewMode: ViewMode;
  selectedFiles: string[];
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onFileClick: (file: FileItem) => void;
  onFileSelect: (path: string, selected: boolean) => void;
  onDownload: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onSort: (field: string) => void;
}

function FileBrowserContent({
  files,
  viewMode,
  selectedFiles,
  sortField,
  sortDirection,
  onFileClick,
  onFileSelect,
  onDownload,
  onRename,
  onDelete,
  onSort,
}: FileBrowserContentProps) {
  if (viewMode === 'list') {
    return (
      <FileListView
        files={files}
        selectedFiles={selectedFiles}
        sortField={sortField}
        sortDirection={sortDirection}
        onFileClick={onFileClick}
        onFileSelect={onFileSelect}
        onDownload={onDownload}
        onRename={onRename}
        onDelete={onDelete}
        onSort={onSort}
      />
    );
  }

  return (
    <FileGridView
      files={files}
      selectedFiles={selectedFiles}
      onFileClick={onFileClick}
      onFileSelect={onFileSelect}
      onDownload={onDownload}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}
