import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

// Hooks
import { useFileBrowser } from '../hooks/useFileBrowser';

// Components
import { FileListView } from '../components/file-browser/FileListView';
import { FileGridView } from '../components/file-browser/FileGridView';
import { FileBrowserToolbar } from '../components/file-browser/FileBrowserToolbar';
import { FileBrowserBreadcrumb } from '../components/file-browser/FileBrowserBreadcrumb';
import { FileBrowserEmptyState } from '../components/file-browser/FileBrowserEmptyState';
import { FileBrowserSelectionBar } from '../components/file-browser/FileBrowserSelectionBar';
import { CreateFolderDialog } from '../components/file-browser/CreateFolderDialog';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
   * Trigger file input for uploads
   */
  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
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
    console.log('Bulk delete:', selectedFiles);
    // TODO: Implement bulk delete
    toast.info('Bulk delete functionality coming soon');
  }, [selectedFiles]);

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
        <FileBrowserBreadcrumb
          currentPath={currentPath}
          onNavigate={navigateToPath}
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
      <Card className="border-border/40 shadow-sm overflow-hidden rounded-lg">
        {/* Compact Toolbar Header */}
        <div className="border-b border-border/40 bg-muted/20">
          <div className="px-2 py-1.5">
            <FileBrowserToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onUpload={triggerUpload}
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

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        onCreateFolder={handleCreateFolder}
        currentPath={currentPath}
        isCreating={isCreatingFolder}
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
    />
  );
}
