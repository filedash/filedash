import {
  FileText,
  Image,
  FileVideo,
  FileAudio,
  Archive,
  Code,
  FileSpreadsheet,
  Presentation,
  FileType,
  File,
  Folder,
  FolderOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// File extension to icon mapping
const EXTENSION_ICON_MAP: Record<string, LucideIcon> = {
  // Text files
  txt: FileText,
  md: FileText,
  rtf: FileText,

  // Documents
  doc: FileText,
  docx: FileText,
  odt: FileText,

  // PDFs
  pdf: FileType,

  // Spreadsheets
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  ods: FileSpreadsheet,
  csv: FileSpreadsheet,

  // Presentations
  ppt: Presentation,
  pptx: Presentation,
  odp: Presentation,

  // Images
  jpg: Image,
  jpeg: Image,
  png: Image,
  gif: Image,
  svg: Image,
  bmp: Image,
  ico: Image,
  webp: Image,

  // Videos
  mp4: FileVideo,
  avi: FileVideo,
  mov: FileVideo,
  wmv: FileVideo,
  flv: FileVideo,
  webm: FileVideo,
  mkv: FileVideo,

  // Audio
  mp3: FileAudio,
  wav: FileAudio,
  flac: FileAudio,
  aac: FileAudio,
  ogg: FileAudio,
  wma: FileAudio,

  // Archives
  zip: Archive,
  rar: Archive,
  tar: Archive,
  gz: Archive,
  bz2: Archive,
  '7z': Archive,

  // Code files
  js: Code,
  ts: Code,
  jsx: Code,
  tsx: Code,
  html: Code,
  css: Code,
  scss: Code,
  less: Code,
  json: Code,
  xml: Code,
  yaml: Code,
  yml: Code,
  py: Code,
  java: Code,
  cpp: Code,
  c: Code,
  h: Code,
  php: Code,
  rb: Code,
  go: Code,
  rs: Code,
  swift: Code,
  kt: Code,
  sh: Code,
  bash: Code,
  zsh: Code,
  sql: Code,
  r: Code,
  matlab: Code,
  m: Code,
};

// Color mapping for different file types
const ICON_COLOR_MAP: Record<string, string> = {
  // Text files - gray
  txt: 'text-slate-600 dark:text-slate-400',
  md: 'text-slate-600 dark:text-slate-400',
  rtf: 'text-slate-600 dark:text-slate-400',

  // Documents - blue
  doc: 'text-blue-600 dark:text-blue-400',
  docx: 'text-blue-600 dark:text-blue-400',
  odt: 'text-blue-600 dark:text-blue-400',
  pdf: 'text-red-600 dark:text-red-400',

  // Spreadsheets - green
  xls: 'text-green-600 dark:text-green-400',
  xlsx: 'text-green-600 dark:text-green-400',
  ods: 'text-green-600 dark:text-green-400',
  csv: 'text-green-600 dark:text-green-400',

  // Presentations - orange
  ppt: 'text-orange-600 dark:text-orange-400',
  pptx: 'text-orange-600 dark:text-orange-400',
  odp: 'text-orange-600 dark:text-orange-400',

  // Images - purple
  jpg: 'text-purple-600 dark:text-purple-400',
  jpeg: 'text-purple-600 dark:text-purple-400',
  png: 'text-purple-600 dark:text-purple-400',
  gif: 'text-purple-600 dark:text-purple-400',
  svg: 'text-purple-600 dark:text-purple-400',
  bmp: 'text-purple-600 dark:text-purple-400',
  ico: 'text-purple-600 dark:text-purple-400',
  webp: 'text-purple-600 dark:text-purple-400',

  // Videos - pink
  mp4: 'text-pink-600 dark:text-pink-400',
  avi: 'text-pink-600 dark:text-pink-400',
  mov: 'text-pink-600 dark:text-pink-400',
  wmv: 'text-pink-600 dark:text-pink-400',
  flv: 'text-pink-600 dark:text-pink-400',
  webm: 'text-pink-600 dark:text-pink-400',
  mkv: 'text-pink-600 dark:text-pink-400',

  // Audio - yellow
  mp3: 'text-yellow-600 dark:text-yellow-400',
  wav: 'text-yellow-600 dark:text-yellow-400',
  flac: 'text-yellow-600 dark:text-yellow-400',
  aac: 'text-yellow-600 dark:text-yellow-400',
  ogg: 'text-yellow-600 dark:text-yellow-400',
  wma: 'text-yellow-600 dark:text-yellow-400',

  // Archives - gray
  zip: 'text-gray-600 dark:text-gray-400',
  rar: 'text-gray-600 dark:text-gray-400',
  tar: 'text-gray-600 dark:text-gray-400',
  gz: 'text-gray-600 dark:text-gray-400',
  bz2: 'text-gray-600 dark:text-gray-400',
  '7z': 'text-gray-600 dark:text-gray-400',

  // Code files - cyan
  js: 'text-cyan-600 dark:text-cyan-400',
  ts: 'text-cyan-600 dark:text-cyan-400',
  jsx: 'text-cyan-600 dark:text-cyan-400',
  tsx: 'text-cyan-600 dark:text-cyan-400',
  html: 'text-cyan-600 dark:text-cyan-400',
  css: 'text-cyan-600 dark:text-cyan-400',
  scss: 'text-cyan-600 dark:text-cyan-400',
  less: 'text-cyan-600 dark:text-cyan-400',
  json: 'text-cyan-600 dark:text-cyan-400',
  xml: 'text-cyan-600 dark:text-cyan-400',
  yaml: 'text-cyan-600 dark:text-cyan-400',
  yml: 'text-cyan-600 dark:text-cyan-400',
  py: 'text-cyan-600 dark:text-cyan-400',
  java: 'text-cyan-600 dark:text-cyan-400',
  cpp: 'text-cyan-600 dark:text-cyan-400',
  c: 'text-cyan-600 dark:text-cyan-400',
  h: 'text-cyan-600 dark:text-cyan-400',
  php: 'text-cyan-600 dark:text-cyan-400',
  rb: 'text-cyan-600 dark:text-cyan-400',
  go: 'text-cyan-600 dark:text-cyan-400',
  rs: 'text-cyan-600 dark:text-cyan-400',
  swift: 'text-cyan-600 dark:text-cyan-400',
  kt: 'text-cyan-600 dark:text-cyan-400',
  sh: 'text-cyan-600 dark:text-cyan-400',
  bash: 'text-cyan-600 dark:text-cyan-400',
  zsh: 'text-cyan-600 dark:text-cyan-400',
  sql: 'text-cyan-600 dark:text-cyan-400',
  r: 'text-cyan-600 dark:text-cyan-400',
  matlab: 'text-cyan-600 dark:text-cyan-400',
  m: 'text-cyan-600 dark:text-cyan-400',
};

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Get the appropriate icon component for a file
 */
export function getFileIcon(filename: string, isDirectory: boolean = false): LucideIcon {
  if (isDirectory) {
    return Folder;
  }

  const extension = getFileExtension(filename);
  return EXTENSION_ICON_MAP[extension] || File;
}

/**
 * Get the folder icon (either open or closed)
 */
export function getFolderIcon(isOpen: boolean = false): LucideIcon {
  return isOpen ? FolderOpen : Folder;
}

/**
 * Get the appropriate color class for a file icon
 */
export function getFileIconColor(filename: string, isDirectory: boolean = false): string {
  if (isDirectory) {
    return 'text-blue-500 dark:text-blue-400'; // Updated to use blue-500 for better contrast
  }

  const extension = getFileExtension(filename);
  return ICON_COLOR_MAP[extension] || 'text-muted-foreground';
}

/**
 * Utility to get both icon and color for a file
 */
export function getFileIconProps(filename: string, isDirectory: boolean = false) {
  return {
    icon: getFileIcon(filename, isDirectory),
    color: getFileIconColor(filename, isDirectory),
  };
}

/**
 * Check if file is an image
 */
export function isImageFile(filename: string): boolean {
  const extension = getFileExtension(filename);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'ico', 'webp'];
  return imageExtensions.includes(extension);
}

/**
 * Check if file is a video
 */
export function isVideoFile(filename: string): boolean {
  const extension = getFileExtension(filename);
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  return videoExtensions.includes(extension);
}

/**
 * Check if file is audio
 */
export function isAudioFile(filename: string): boolean {
  const extension = getFileExtension(filename);
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'];
  return audioExtensions.includes(extension);
}
