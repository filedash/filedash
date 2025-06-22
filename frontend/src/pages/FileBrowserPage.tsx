import { useState } from 'react';
import { useFileBrowser } from '../hooks/useFileBrowser';
import { FileList } from '../components/file-browser/FileList';
import { FileGrid } from '../components/file-browser/FileGrid';
import { ViewToggle, type ViewMode } from '../components/file-browser/ViewToggle';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Upload, RefreshCw, FolderPlus } from 'lucide-react';

export function FileBrowserPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  const {
    currentPath,
    files,
    selectedFiles,
    isLoading,
    error,
    navigateToPath,
    handleFileDoubleClick,
    handleFileSelect,
    refresh,
  } = useFileBrowser();

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Files</h1>
              {!isLoading && (
                <Badge variant="secondary" className="text-xs">
                  {files.length} items
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage and organize your files
            </p>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm">
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FolderPlus className="h-4 w-4" />
              <span className="sr-only">New Folder</span>
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4" />
              <span className="sr-only">Upload</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
          <Breadcrumb path={currentPath} onNavigate={navigateToPath} />
        </div>
        <Separator />
      </div>

      {/* File List/Grid */}
      <Card className="border-border/40">
        {isLoading ? (
          <LoadingSpinner message="Loading files..." />
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <FolderPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">This folder is empty</h3>
            <p className="text-muted-foreground mb-4">
              Get started by uploading files or creating a new folder
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
              <Button variant="outline" size="sm">
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <FileList
            files={files}
            onFileClick={() => {}} // Just for single click selection if needed
            onFileDoubleClick={handleFileDoubleClick}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
          />
        ) : (
          <FileGrid
            files={files}
            onFileClick={() => {}} // Just for single click selection if needed
            onFileDoubleClick={handleFileDoubleClick}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
          />
        )}
      </Card>

      {/* Selection Info */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/50 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''}{' '}
            selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Download
            </Button>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
