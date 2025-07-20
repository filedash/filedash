/**
 * Path truncation utilities for consistent path display across components
 */

export interface PathTruncationOptions {
  /** Maximum number of path segments to show */
  maxSegments?: number;
  /** Maximum length for individual folder/file names */
  maxSegmentLength?: number;
  /** Available space category - affects truncation strategy */
  availableSpace?: 'small' | 'medium' | 'large';
}

/**
 * Default truncation options based on available space
 */
const DEFAULT_OPTIONS: Record<string, PathTruncationOptions> = {
  small: {
    maxSegments: 2,
    maxSegmentLength: 15,
  },
  medium: {
    maxSegments: 3,
    maxSegmentLength: 20,
  },
  large: {
    maxSegments: 5,
    maxSegmentLength: 30,
  },
};

/**
 * Truncate a single path segment (folder/file name) if it's too long
 */
function truncateSegment(segment: string, maxLength: number): string {
  if (segment.length <= maxLength) return segment;
  return segment.substring(0, maxLength) + '...';
}

/**
 * Truncate a file path for display purposes
 * @param path - The file path to truncate
 * @param options - Truncation options
 * @returns Truncated path string
 */
export function truncatePath(path: string, options: PathTruncationOptions = {}): string {
  // Handle special cases
  if (path === '/' || path === 'Home') return path === '/' ? 'Home' : path;

  // Get default options based on available space
  const availableSpace = options.availableSpace || 'medium';
  const defaultOptions = DEFAULT_OPTIONS[availableSpace];

  // Merge options with defaults
  const finalOptions: Required<PathTruncationOptions> = {
    maxSegments: options.maxSegments || defaultOptions.maxSegments || 3,
    maxSegmentLength: options.maxSegmentLength || defaultOptions.maxSegmentLength || 20,
    availableSpace,
  };

  // Convert path to segments
  const normalizedPath = path === 'Home' ? '/' : path;
  const segments = normalizedPath.split('/').filter(Boolean);

  // If we have fewer segments than the limit, just truncate individual segments
  if (segments.length <= finalOptions.maxSegments) {
    const truncatedSegments = segments.map(segment =>
      truncateSegment(segment, finalOptions.maxSegmentLength)
    );
    return '/' + truncatedSegments.join('/');
  }

  // Show "..." followed by last segments, truncating long segment names
  const lastSegments = segments.slice(-finalOptions.maxSegments).map(segment =>
    truncateSegment(segment, finalOptions.maxSegmentLength)
  );
  return '/.../' + lastSegments.join('/');
}

/**
 * Truncate breadcrumb items for display
 * @param items - Array of breadcrumb items
 * @param options - Truncation options
 * @returns Truncated breadcrumb items
 */
export function truncateBreadcrumbItems(
  items: Array<{ name: string; path: string }>,
  options: PathTruncationOptions = {}
): Array<{ name: string; path: string }> {
  const availableSpace = options.availableSpace || 'medium';
  const defaultOptions = DEFAULT_OPTIONS[availableSpace];

  const finalOptions: Required<PathTruncationOptions> = {
    maxSegments: options.maxSegments || defaultOptions.maxSegments || 3,
    maxSegmentLength: options.maxSegmentLength || defaultOptions.maxSegmentLength || 20,
    availableSpace,
  };

  // Always keep the home item
  if (items.length <= finalOptions.maxSegments + 1) { // +1 for Home
    return items.map(item => ({
      ...item,
      name: item.name === 'Home' ? item.name : truncateSegment(item.name, finalOptions.maxSegmentLength),
    }));
  }

  // Show Home + ... + last segments
  const result = [items[0]]; // Home

  // Add ellipsis indicator
  result.push({
    name: '...',
    path: items[Math.floor(items.length / 2)].path, // Middle path for ellipsis click
  });

  // Add last segments
  const lastItems = items.slice(-(finalOptions.maxSegments - 1)).map(item => ({
    ...item,
    name: truncateSegment(item.name, finalOptions.maxSegmentLength),
  }));

  result.push(...lastItems);
  return result;
}

/**
 * Get display path for CreateFolderDialog
 * This is a convenience function specifically for the dialog
 */
export function getCreateFolderDisplayPath(
  currentPath: string,
  availableSpace: 'small' | 'medium' | 'large' = 'small'
): string {
  const displayPath = currentPath === '/' ? 'Home' : currentPath;
  return truncatePath(displayPath, { availableSpace });
}
