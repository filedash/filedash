import { useState, useRef } from 'react';
import { useFileBrowser } from '../hooks/useFileBrowser';
import { FileList } from '../components/file-browser/FileList';
import { FileGrid } from '../components/file-browser/FileGrid';
import {
  ViewToggle,
  type ViewMode,
} from '../components/file-browser/ViewToggle';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Upload, RefreshCw, FolderPlus } from 'lucide-react';
import { fileService } from '../services/fileService';
import type { FileItem } from '../types/file';
import { toast } from 'sonner';

export function FileBrowserPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download handler
  const handleDownload = async (file: FileItem) => {
    try {
      toast.promise(fileService.downloadFile(file.path), {
        loading: `Downloading ${file.name}...`,
        success: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return `Downloaded ${file.name}`;
        },
        error: `Failed to download ${file.name}`,
      });
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const {
    currentPath,
    files,
    selectedFiles,
    isLoading,
    error,
    navigateToPath,
    handleFileClick,
    handleFileSelect,
    refresh,
  } = useFileBrowser('/', handleDownload);

  // Upload handler
  const handleUpload = async (files: FileList) => {
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
          console.log('Upload successful:', result);
          refresh();
          return `Successfully uploaded ${fileNames}`;
        },
        error: (error) => {
          console.error('Upload error:', error);
          return `Failed to upload files: ${error.message || 'Unknown error'}`;
        },
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  // Trigger file upload
  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Files
              </h1>
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
            <Button variant="outline" size="sm" className="cursor-pointer">
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerUpload}
              className="cursor-pointer"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              className="cursor-pointer disabled:cursor-not-allowed"
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
            <Button variant="outline" size="sm" className="cursor-pointer">
              <FolderPlus className="h-4 w-4" />
              <span className="sr-only">New Folder</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerUpload}
              className="cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span className="sr-only">Upload</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              className="cursor-pointer disabled:cursor-not-allowed"
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
              <Button
                variant="outline"
                size="sm"
                onClick={triggerUpload}
                className="cursor-pointer"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
              <Button variant="outline" size="sm" className="cursor-pointer">
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <FileList
            files={files}
            onFileClick={handleFileClick}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
            onDownload={handleDownload}
          />
        ) : (
          <FileGrid
            files={files}
            onFileClick={handleFileClick}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
            onDownload={handleDownload}
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

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) {
            handleUpload(e.target.files);
            // Reset the input so the same file can be uploaded again
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
