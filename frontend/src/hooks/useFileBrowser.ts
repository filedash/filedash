import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fileService } from '../services/fileService';
import type { FileItem, ViewMode, SortField, SortDirection } from '../types/file';
import { normalizePath } from '../utils/file';

export function useFileBrowser(initialPath = '/', onFileOpen?: (file: FileItem) => void) {
  const [currentPath, setCurrentPath] = useState(normalizePath(initialPath));
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch files for current path
  const {
    data: fileListResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['files', currentPath],
    queryFn: () => fileService.listFiles(currentPath === '/' ? undefined : currentPath),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  const files = useMemo(() => fileListResponse?.files ?? [], [fileListResponse?.files]);

  const navigateToPath = useCallback((path: string) => {
    const normalizedPath = normalizePath(path);
    setCurrentPath(normalizedPath);
    setSelectedFiles([]); // Clear selection when navigating
  }, []);

  const navigateUp = useCallback(() => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/');
    navigateToPath(parentPath);
  }, [currentPath, navigateToPath]);

  const handleFileClick = useCallback((file: FileItem) => {
    if (file.is_directory) {
      navigateToPath(file.path);
    } else {
      // Handle file opening (download or preview)
      onFileOpen?.(file);
    }
  }, [navigateToPath, onFileOpen]);

  const handleFileSelect = useCallback((path: string, selected: boolean) => {
    setSelectedFiles(prev => {
      if (selected) {
        return [...prev, path];
      } else {
        return prev.filter(p => p !== path);
      }
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFiles(files.map(file => file.path));
  }, [files]);

  const selectNone = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    // State
    currentPath,
    files,
    selectedFiles,
    viewMode,
    sortField,
    sortDirection,
    isLoading,
    error,

    // Actions
    navigateToPath,
    navigateUp,
    handleFileClick,
    handleFileSelect,
    selectAll,
    selectNone,
    setViewMode,
    setSortField,
    setSortDirection,
    refresh,
  };
}
