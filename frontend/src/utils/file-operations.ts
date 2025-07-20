import type { FileItem } from '../types/file';
import type { FileService } from '../services/fileService';
import { formatDistanceToNow, format, isToday, isYesterday, parseISO, isValid } from 'date-fns';

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
 * Format date for display with human-readable relative time
 * Examples: "2 minutes ago", "yesterday 7:30 PM", "Dec 15, 2023"
 */
export function formatDate(dateString: string): string {
  if (!dateString) {
    return 'Unknown';
  }

  let date: Date;
  
  // Try to parse as ISO string first, then fallback to general parsing
  try {
    // Use date-fns parseISO for better ISO string handling
    date = parseISO(dateString);
    
    // If parseISO didn't work, try the regular Date constructor
    if (!isValid(date)) {
      date = new Date(dateString);
    }
    
    // Final validation
    if (!isValid(date)) {
      return 'Invalid date';
    }
  } catch {
    return 'Invalid date';
  }

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  // Less than 1 hour ago - show relative time (e.g., "5 minutes ago")
  if (diffInHours < 1 && diffInMs >= 0) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  // Today - show just time (e.g., "2:30 PM")
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }

  // Yesterday - show "yesterday" with time (e.g., "Yesterday 7:30 PM")
  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  }

  // Less than 7 days ago - show day of week with time (e.g., "Monday 3:45 PM")
  if (diffInHours < 7 * 24 && diffInMs >= 0) {
    return format(date, 'EEEE h:mm a');
  }

  // Same year - show month and day with time (e.g., "Dec 15, 3:45 PM")
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, 'MMM d, h:mm a');
  }

  // Different year - show full date with time (e.g., "Dec 15, 2023, 3:45 PM")
  return format(date, 'MMM d, yyyy, h:mm a');
}/**
 * Reserved Windows file names that should not be used
 */
const RESERVED_NAMES = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

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

  if (RESERVED_NAMES.includes(name.toUpperCase())) {
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
