import {
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FolderOpen,
  Folder,
  Archive,
  type LucideIcon
} from 'lucide-react';

export function getFileIcon(
  isDirectory: boolean,
  mimeType?: string,
  filename?: string,
  isOpen = false
): LucideIcon {
  if (isDirectory) {
    return isOpen ? FolderOpen : Folder;
  }

  // Get file type from MIME type or extension
  let fileType = 'file';

  if (mimeType) {
    if (mimeType.startsWith('image/')) fileType = 'image';
    else if (mimeType.startsWith('video/')) fileType = 'video';
    else if (mimeType.startsWith('audio/')) fileType = 'audio';
    else if (mimeType.includes('pdf')) fileType = 'pdf';
    else if (mimeType.includes('text/') || mimeType.includes('json') || mimeType.includes('xml')) fileType = 'text';
    else if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) fileType = 'archive';
    else if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('css')) fileType = 'code';
  }

  if (filename && fileType === 'file') {
    const ext = filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) fileType = 'image';
    else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) fileType = 'video';
    else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) fileType = 'audio';
    else if (['pdf'].includes(ext)) fileType = 'pdf';
    else if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) fileType = 'text';
    else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) fileType = 'archive';
    else if (['js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'html', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext)) fileType = 'code';
  }

  switch (fileType) {
    case 'image':
      return FileImage;
    case 'video':
      return FileVideo;
    case 'audio':
      return FileAudio;
    case 'text':
    case 'pdf':
      return FileText;
    case 'archive':
      return Archive;
    case 'code':
      return FileCode;
    default:
      return File;
  }
}
