/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date to human readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Get file type from MIME type or extension
 */
export function getFileType(mimeType?: string, filename?: string): string {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('text/') || mimeType.includes('json') || mimeType.includes('xml')) return 'text';
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return 'archive';
  }

  if (filename) {
    const ext = getFileExtension(filename).toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) return 'text';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'document';
  }

  return 'file';
}

/**
 * Validate file path
 */
export function isValidPath(path: string): boolean {
  // Basic path validation - can be enhanced based on requirements
  return !path.includes('..') && !path.includes('//') && path.length > 0;
}

/**
 * Normalize file path
 */
export function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

/**
 * Get parent directory path
 */
export function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

/**
 * Get breadcrumb items from path
 */
export function getBreadcrumbItems(path: string): Array<{ name: string; path: string }> {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);

  const items = [{ name: 'Home', path: '/' }];

  let currentPath = '';
  for (const part of parts) {
    currentPath += '/' + part;
    items.push({ name: part, path: currentPath });
  }

  return items;
}
