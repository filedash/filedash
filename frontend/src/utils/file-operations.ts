import type { FileItem } from '../types/file';
import type { FileService } from '../services/fileService';

/**
 * Download file utility function
 */
export async function downloadFile(file: FileItem, fileService: FileService): Promise<void> {
  const blob = await fileService.downloadFile(file.path);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format date in human readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 day ago
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Less than 1 year ago
  if (diff < 365 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // More than 1 year ago
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Validate file name
 */
export function validateFileName(name: string): { isValid: boolean; error?: string } {
  if (!name.trim()) {
    return { isValid: false, error: 'File name cannot be empty' };
  }

  if (name.length > 255) {
    return { isValid: false, error: 'File name too long (max 255 characters)' };
  }

  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    return { isValid: false, error: 'File name contains invalid characters' };
  }

  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reservedNames.includes(name.toUpperCase())) {
    return { isValid: false, error: 'File name is reserved' };
  }

  return { isValid: true };
}

/**
 * Get file size category for display purposes
 */
export function getFileSizeCategory(bytes: number): 'small' | 'medium' | 'large' | 'huge' {
  if (bytes < 1024 * 1024) return 'small'; // < 1MB
  if (bytes < 100 * 1024 * 1024) return 'medium'; // < 100MB
  if (bytes < 1024 * 1024 * 1024) return 'large'; // < 1GB
  return 'huge'; // >= 1GB
}

/**
 * Check if file type is previewable
 */
export function isPreviewableFile(file: FileItem): boolean {
  if (file.is_directory) return false;

  const previewableExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', // Images
    'txt', 'md', 'json', 'xml', 'csv', 'log', // Text
    'pdf', // Documents
  ];

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return previewableExtensions.includes(extension);
}

/**
 * Sort files with directories first
 */
export function sortFiles(files: FileItem[], field: string, direction: 'asc' | 'desc'): FileItem[] {
  return [...files].sort((a, b) => {
    // Always show directories first
    if (a.is_directory && !b.is_directory) return -1;
    if (!a.is_directory && b.is_directory) return 1;

    let comparison = 0;
    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'modified':
        comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
        break;
      default:
        comparison = a.name.localeCompare(b.name);
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}
