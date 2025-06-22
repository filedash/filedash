import { useFileBrowser } from '../hooks/useFileBrowser';
import { FileList } from '../components/file-browser/FileList';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Upload, RefreshCw, FolderPlus } from 'lucide-react';

export function FileBrowserPage() {
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Breadcrumb path={currentPath} onNavigate={navigateToPath} />

        <div className="flex items-center gap-2">
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

      {/* File List */}
      <Card>
        {isLoading ? (
          <LoadingSpinner message="Loading files..." />
        ) : files.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">This folder is empty</p>
          </div>
        ) : (
          <FileList
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
        <div className="text-sm text-muted-foreground">
          {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''}{' '}
          selected
        </div>
      )}
    </div>
  );
}
