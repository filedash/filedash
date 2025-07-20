import type { FileListResponse, UploadResponse, FileItem } from '../types/file';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface VerifyResponse {
  valid: boolean;
  user: {
    id: string;
    username: string;
  };
}

interface FileOperationResponse {
  message: string;
  path: string;
}

interface RenameResponse {
  message: string;
  from: string;
  to: string;
}

// Mock data for demo purposes
const mockFiles: FileItem[] = [
  {
    name: 'Documents',
    path: '/Documents',
    size: 0,
    modified: '2024-01-15T10:30:00Z',
    is_directory: true,
    permissions: 'drwxr-xr-x',
  },
  {
    name: 'Images',
    path: '/Images',
    size: 0,
    modified: '2024-01-14T15:22:00Z',
    is_directory: true,
    permissions: 'drwxr-xr-x',
  },
  {
    name: 'demo.txt',
    path: '/demo.txt',
    size: 1024,
    modified: '2024-01-16T09:15:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'text/plain',
  },
  {
    name: 'README.md',
    path: '/README.md',
    size: 2048,
    modified: '2024-01-16T11:45:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'text/markdown',
  },
  {
    name: 'sample.pdf',
    path: '/sample.pdf',
    size: 524288,
    modified: '2024-01-15T16:30:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'application/pdf',
  },
];

const documentsFiles: FileItem[] = [
  {
    name: 'report.docx',
    path: '/Documents/report.docx',
    size: 51200,
    modified: '2024-01-15T14:20:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    name: 'budget.xlsx',
    path: '/Documents/budget.xlsx',
    size: 32768,
    modified: '2024-01-14T12:15:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    name: 'presentation.pptx',
    path: '/Documents/presentation.pptx',
    size: 1048576,
    modified: '2024-01-16T08:30:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
];

const imagesFiles: FileItem[] = [
  {
    name: 'photo1.jpg',
    path: '/Images/photo1.jpg',
    size: 2097152,
    modified: '2024-01-12T18:45:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'image/jpeg',
  },
  {
    name: 'screenshot.png',
    path: '/Images/screenshot.png',
    size: 524288,
    modified: '2024-01-13T10:20:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'image/png',
  },
  {
    name: 'diagram.svg',
    path: '/Images/diagram.svg',
    size: 8192,
    modified: '2024-01-14T16:10:00Z',
    is_directory: false,
    permissions: '-rw-r--r--',
    mime_type: 'image/svg+xml',
  },
];

// Mock auth token for demo
const MOCK_TOKEN = 'demo-jwt-token-12345';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockApiService {
  private token: string | null = null;
  private filesData: FileItem[] = [...mockFiles];
  private documentsData: FileItem[] = [...documentsFiles];
  private imagesData: FileItem[] = [...imagesFiles];

  constructor() {
    // Only initialize with mock token if no token exists in localStorage
    const existingToken = localStorage.getItem('auth_token');
    if (!existingToken) {
      this.token = MOCK_TOKEN;
      localStorage.setItem('auth_token', MOCK_TOKEN);
    } else {
      this.token = existingToken;
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private getFilesForPath(path: string): FileItem[] {
    const normalizedPath = path === '/' ? '' : path;

    if (normalizedPath === '' || normalizedPath === '/') {
      return this.filesData;
    } else if (normalizedPath === '/Documents') {
      return this.documentsData;
    } else if (normalizedPath === '/Images') {
      return this.imagesData;
    }
    return [];
  }

  async get<T>(endpoint: string): Promise<T> {
    await delay(300); // Simulate network delay

    // Parse endpoint and handle different routes
    if (endpoint.startsWith('/files')) {
      return this.handleFilesEndpoint(endpoint) as T;
    }

    if (endpoint === '/health') {
      return 'OK' as T;
    }

    // Auth endpoints
    if (endpoint.startsWith('/auth')) {
      return this.handleAuthEndpoint(endpoint) as T;
    }

    throw new Error(`Mock API: Unhandled GET endpoint: ${endpoint}`);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    await delay(400); // Simulate network delay

    if (endpoint === '/files/upload') {
      return this.handleFileUpload(data as FormData) as T;
    }

    if (endpoint === '/files/mkdir') {
      return this.handleCreateDirectory(data as { path: string; recursive: boolean }) as T;
    }

    if (endpoint.startsWith('/auth/login')) {
      return this.handleLogin(data) as T;
    }

    throw new Error(`Mock API: Unhandled POST endpoint: ${endpoint}`);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    await delay(300);

    if (endpoint === '/files/rename') {
      return this.handleRename(data as { from: string; to: string }) as T;
    }

    throw new Error(`Mock API: Unhandled PUT endpoint: ${endpoint}`);
  }

  async delete<T>(endpoint: string): Promise<T> {
    await delay(200);

    if (endpoint.startsWith('/files/')) {
      const path = decodeURIComponent(endpoint.replace('/files/', ''));
      return this.handleFileDelete(path) as T;
    }

    throw new Error(`Mock API: Unhandled DELETE endpoint: ${endpoint}`);
  }

  async uploadFile(_endpoint: string, formData: FormData, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    // Simulate upload progress
    if (onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        await delay(50);
        onProgress(i);
      }
    }

    return this.handleFileUpload(formData);
  }

  async downloadFile(endpoint: string): Promise<Blob> {
    await delay(200);

    // Create a mock file blob for download
    const path = decodeURIComponent(endpoint.replace('/files/download/', ''));
    const fileName = path.split('/').pop() || 'file';
    const content = `This is mock content for file: ${fileName}\nGenerated for demo purposes.`;

    return new Blob([content], { type: 'text/plain' });
  }

  private handleFilesEndpoint(endpoint: string): FileListResponse {
    const url = new URL(`http://localhost${endpoint}`);
    const path = url.searchParams.get('path') || '/';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const files = this.getFilesForPath(path);

    return {
      files,
      total: files.length,
      page,
      limit,
    };
  }

  private handleAuthEndpoint(endpoint: string): VerifyResponse | { message: string } {
    if (endpoint === '/auth/verify') {
      return { valid: true, user: { id: 'demo-user', username: 'demo' } };
    }
    return { message: 'Mock auth response' };
  }

  private handleLogin(data: { username?: string } | unknown): AuthResponse {
    const loginData = data as { username?: string };
    return {
      token: MOCK_TOKEN,
      user: {
        id: 'demo-user',
        username: loginData?.username || 'demo',
        email: 'demo@example.com',
      },
    };
  }

  private handleFileUpload(formData: FormData): UploadResponse {
    const files = formData.getAll('file') as File[];
    const path = formData.get('path') as string || '/';

    const uploaded = files.map(file => ({
      name: file.name,
      path: `${path}/${file.name}`,
      size: file.size,
    }));

    // Add uploaded files to mock data
    const targetArray = path === '/Documents' ? this.documentsData :
      path === '/Images' ? this.imagesData :
        this.filesData;

    files.forEach(file => {
      targetArray.push({
        name: file.name,
        path: `${path}/${file.name}`,
        size: file.size,
        modified: new Date().toISOString(),
        is_directory: false,
        permissions: '-rw-r--r--',
        mime_type: file.type || 'application/octet-stream',
      });
    });

    return {
      uploaded,
      errors: [],
    };
  }

  private handleCreateDirectory(data: { path: string; recursive: boolean }): FileOperationResponse {
    const newDir: FileItem = {
      name: data.path.split('/').pop() || 'New Directory',
      path: data.path,
      size: 0,
      modified: new Date().toISOString(),
      is_directory: true,
      permissions: 'drwxr-xr-x',
    };

    this.filesData.push(newDir);

    return {
      message: 'Directory created successfully',
      path: data.path,
    };
  }

  private handleRename(data: { from: string; to: string }): RenameResponse {
    // Find and update the file in mock data
    const allFiles = [...this.filesData, ...this.documentsData, ...this.imagesData];
    const file = allFiles.find(f => f.path === data.from);

    if (file) {
      file.path = data.to;
      file.name = data.to.split('/').pop() || file.name;
    }

    return {
      message: 'File renamed successfully',
      from: data.from,
      to: data.to,
    };
  }

  private handleFileDelete(path: string): FileOperationResponse {
    // Remove from all mock data arrays
    this.filesData = this.filesData.filter(f => f.path !== `/${path}`);
    this.documentsData = this.documentsData.filter(f => f.path !== `/${path}`);
    this.imagesData = this.imagesData.filter(f => f.path !== `/${path}`);

    return {
      message: 'File deleted successfully',
      path: `/${path}`,
    };
  }
}

export const mockApiService = new MockApiService();
