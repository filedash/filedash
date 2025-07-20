import type { LucideIcon } from 'lucide-react';
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
  Database,
  Settings,
  FileCode2,
  Globe,
  Package,
} from 'lucide-react';

/**
 * File type categories for better organization
 */
export const FileCategory = {
  TEXT: 'text',
  DOCUMENT: 'document',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  CODE: 'code',
  DATA: 'data',
  CONFIG: 'config',
  WEB: 'web',
  EXECUTABLE: 'executable',
  FOLDER: 'folder',
  UNKNOWN: 'unknown',
} as const;

export type FileCategory = typeof FileCategory[keyof typeof FileCategory];

/**
 * File type configuration interface
 */
interface FileTypeConfig {
  category: FileCategory;
  icon: LucideIcon;
  color: string;
  extensions: string[];
  description?: string;
}

/**
 * Comprehensive file type registry
 */
const FILE_TYPE_REGISTRY: Record<FileCategory, FileTypeConfig> = {
  [FileCategory.TEXT]: {
    category: FileCategory.TEXT,
    icon: FileText,
    color: 'text-slate-600 dark:text-slate-400',
    extensions: ['txt', 'md', 'rtf', 'log', 'readme'],
    description: 'Plain text files',
  },

  [FileCategory.DOCUMENT]: {
    category: FileCategory.DOCUMENT,
    icon: FileType,
    color: 'text-blue-600 dark:text-blue-400',
    extensions: ['pdf', 'doc', 'docx', 'odt'],
    description: 'Document files',
  },

  [FileCategory.IMAGE]: {
    category: FileCategory.IMAGE,
    icon: Image,
    color: 'text-purple-600 dark:text-purple-400',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'ico', 'webp', 'tiff', 'raw'],
    description: 'Image files',
  },

  [FileCategory.VIDEO]: {
    category: FileCategory.VIDEO,
    icon: FileVideo,
    color: 'text-pink-600 dark:text-pink-400',
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp'],
    description: 'Video files',
  },

  [FileCategory.AUDIO]: {
    category: FileCategory.AUDIO,
    icon: FileAudio,
    color: 'text-yellow-600 dark:text-yellow-400',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
    description: 'Audio files',
  },

  [FileCategory.ARCHIVE]: {
    category: FileCategory.ARCHIVE,
    icon: Archive,
    color: 'text-gray-600 dark:text-gray-400',
    extensions: ['zip', 'rar', 'tar', 'gz', 'bz2', '7z', 'xz', 'dmg', 'iso'],
    description: 'Archive files',
  },

  [FileCategory.CODE]: {
    category: FileCategory.CODE,
    icon: Code,
    color: 'text-emerald-600 dark:text-emerald-400',
    extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'dart', 'vue', 'svelte'],
    description: 'Source code files',
  },

  [FileCategory.DATA]: {
    category: FileCategory.DATA,
    icon: Database,
    color: 'text-indigo-600 dark:text-indigo-400',
    extensions: ['json', 'xml', 'yaml', 'yml', 'csv', 'sql', 'db', 'sqlite'],
    description: 'Data files',
  },

  [FileCategory.CONFIG]: {
    category: FileCategory.CONFIG,
    icon: Settings,
    color: 'text-orange-600 dark:text-orange-400',
    extensions: ['config', 'conf', 'ini', 'toml', 'env', 'properties', 'lock', 'gitignore'],
    description: 'Configuration files',
  },

  [FileCategory.WEB]: {
    category: FileCategory.WEB,
    icon: Globe,
    color: 'text-cyan-600 dark:text-cyan-400',
    extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less'],
    description: 'Web files',
  },

  [FileCategory.EXECUTABLE]: {
    category: FileCategory.EXECUTABLE,
    icon: Package,
    color: 'text-red-600 dark:text-red-400',
    extensions: ['exe', 'app', 'deb', 'rpm', 'msi', 'dmg', 'pkg'],
    description: 'Executable files',
  },

  [FileCategory.FOLDER]: {
    category: FileCategory.FOLDER,
    icon: Folder,
    color: 'text-blue-500 dark:text-blue-400',
    extensions: [],
    description: 'Folders',
  },

  [FileCategory.UNKNOWN]: {
    category: FileCategory.UNKNOWN,
    icon: File,
    color: 'text-muted-foreground',
    extensions: [],
    description: 'Unknown file types',
  },
};

/**
 * Special file type configurations for specific extensions
 */
const SPECIAL_EXTENSIONS: Record<string, FileTypeConfig> = {
  // Spreadsheets
  'xls': {
    category: FileCategory.DOCUMENT,
    icon: FileSpreadsheet,
    color: 'text-green-600 dark:text-green-400',
    extensions: ['xls'],
    description: 'Spreadsheet file',
  },
  'xlsx': {
    category: FileCategory.DOCUMENT,
    icon: FileSpreadsheet,
    color: 'text-green-600 dark:text-green-400',
    extensions: ['xlsx'],
    description: 'Spreadsheet file',
  },
  'ods': {
    category: FileCategory.DOCUMENT,
    icon: FileSpreadsheet,
    color: 'text-green-600 dark:text-green-400',
    extensions: ['ods'],
    description: 'Spreadsheet file',
  },

  // Presentations
  'ppt': {
    category: FileCategory.DOCUMENT,
    icon: Presentation,
    color: 'text-orange-600 dark:text-orange-400',
    extensions: ['ppt'],
    description: 'Presentation file',
  },
  'pptx': {
    category: FileCategory.DOCUMENT,
    icon: Presentation,
    color: 'text-orange-600 dark:text-orange-400',
    extensions: ['pptx'],
    description: 'Presentation file',
  },
  'odp': {
    category: FileCategory.DOCUMENT,
    icon: Presentation,
    color: 'text-orange-600 dark:text-orange-400',
    extensions: ['odp'],
    description: 'Presentation file',
  },

  // Shell scripts
  'sh': {
    category: FileCategory.CODE,
    icon: FileCode2,
    color: 'text-teal-600 dark:text-teal-400',
    extensions: ['sh'],
    description: 'Shell script',
  },
  'bash': {
    category: FileCategory.CODE,
    icon: FileCode2,
    color: 'text-teal-600 dark:text-teal-400',
    extensions: ['bash'],
    description: 'Bash script',
  },
  'zsh': {
    category: FileCategory.CODE,
    icon: FileCode2,
    color: 'text-teal-600 dark:text-teal-400',
    extensions: ['zsh'],
    description: 'ZSH script',
  },
};

/**
 * Build extension to category map for fast lookups
 */
const EXTENSION_TO_CATEGORY_MAP = new Map<string, FileCategory>();

// Populate the map
Object.entries(FILE_TYPE_REGISTRY).forEach(([category, config]) => {
  config.extensions.forEach(ext => {
    EXTENSION_TO_CATEGORY_MAP.set(ext.toLowerCase(), category as FileCategory);
  });
});

/**
 * Enhanced file icon registry class
 */
export class FileIconRegistry {
  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  /**
   * Get file category based on extension
   */
  static getFileCategory(filename: string, isDirectory: boolean = false): FileCategory {
    if (isDirectory) return FileCategory.FOLDER;

    const extension = this.getFileExtension(filename);
    if (!extension) return FileCategory.UNKNOWN;

    // Check special extensions first
    if (SPECIAL_EXTENSIONS[extension]) {
      return SPECIAL_EXTENSIONS[extension].category;
    }

    // Check general categories
    return EXTENSION_TO_CATEGORY_MAP.get(extension) || FileCategory.UNKNOWN;
  }

  /**
   * Get file type configuration
   */
  static getFileTypeConfig(filename: string, isDirectory: boolean = false): FileTypeConfig {
    const extension = this.getFileExtension(filename);

    // Check special extensions first
    if (!isDirectory && SPECIAL_EXTENSIONS[extension]) {
      return SPECIAL_EXTENSIONS[extension];
    }

    const category = this.getFileCategory(filename, isDirectory);
    return FILE_TYPE_REGISTRY[category];
  }

  /**
   * Get the appropriate icon for a file
   */
  static getFileIcon(filename: string, isDirectory: boolean = false): LucideIcon {
    if (isDirectory) {
      return Folder;
    }

    const config = this.getFileTypeConfig(filename, isDirectory);
    return config.icon;
  }

  /**
   * Get the appropriate color for a file icon
   */
  static getFileIconColor(filename: string, isDirectory: boolean = false): string {
    const config = this.getFileTypeConfig(filename, isDirectory);
    return config.color;
  }

  /**
   * Get folder icon (open or closed)
   */
  static getFolderIcon(isOpen: boolean = false): LucideIcon {
    return isOpen ? FolderOpen : Folder;
  }

  /**
   * Get folder color
   */
  static getFolderIconColor(): string {
    return 'text-blue-500 dark:text-blue-400';
  }

  /**
   * Get both icon and color for a file
   */
  static getFileIconProps(filename: string, isDirectory: boolean = false) {
    return {
      icon: this.getFileIcon(filename, isDirectory),
      color: this.getFileIconColor(filename, isDirectory),
      category: this.getFileCategory(filename, isDirectory),
    };
  }

  /**
   * Check if file is of a specific category
   */
  static isFileOfCategory(filename: string, category: FileCategory): boolean {
    return this.getFileCategory(filename) === category;
  }

  /**
   * Get all supported extensions for a category
   */
  static getExtensionsForCategory(category: FileCategory): string[] {
    const config = FILE_TYPE_REGISTRY[category];
    if (!config) return [];

    const extensions = [...config.extensions];

    // Add special extensions that belong to this category
    Object.entries(SPECIAL_EXTENSIONS).forEach(([ext, specialConfig]) => {
      if (specialConfig.category === category) {
        extensions.push(ext);
      }
    });

    return extensions;
  }

  /**
   * Register a new file type or override existing one
   */
  static registerFileType(extension: string, config: Partial<FileTypeConfig> & Pick<FileTypeConfig, 'icon' | 'color'>) {
    const fullConfig: FileTypeConfig = {
      category: FileCategory.UNKNOWN,
      extensions: [extension],
      ...config,
    };

    SPECIAL_EXTENSIONS[extension.toLowerCase()] = fullConfig;
    EXTENSION_TO_CATEGORY_MAP.set(extension.toLowerCase(), fullConfig.category);
  }
}

// Export convenience functions for backward compatibility
export const getFileIcon = FileIconRegistry.getFileIcon;
export const getFileIconColor = FileIconRegistry.getFileIconColor;
export const getFolderIcon = FileIconRegistry.getFolderIcon;
export const getFileIconProps = FileIconRegistry.getFileIconProps;
