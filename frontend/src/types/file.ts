export interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: string;
  is_directory: boolean;
  permissions: string;
  mime_type?: string;
}

export interface FileListResponse {
  files: FileItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UploadResponse {
  uploaded: {
    name: string;
    path: string;
    size: number;
  }[];
  errors: string[];
}

export interface SearchResult {
  name: string;
  path: string;
  score: number;
  size: number;
  modified: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

export interface ApiError {
  message: string;
  code?: string;
}

export type ViewMode = 'list' | 'grid';
export type SortField = 'name' | 'size' | 'modified';
export type SortDirection = 'asc' | 'desc';

export interface ViewPreferences {
  mode: ViewMode;
  sortField: SortField;
  sortDirection: SortDirection;
}
