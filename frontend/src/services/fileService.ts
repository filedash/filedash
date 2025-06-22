import { apiService } from './api';
import type { FileListResponse, UploadResponse } from '../types/file';

class FileService {
  async listFiles(path?: string, page = 1, limit = 100): Promise<FileListResponse> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return apiService.get<FileListResponse>(`/files?${params.toString()}`);
  }

  async downloadFile(path: string): Promise<Blob> {
    const encodedPath = encodeURIComponent(path);
    return apiService.downloadFile(`/files/download/${encodedPath}`);
  }

  async uploadFiles(files: File[], path?: string, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('file', file));
    if (path) formData.append('path', path);

    return apiService.uploadFile('/files/upload', formData, onProgress);
  }

  async deleteFile(path: string): Promise<{ message: string; path: string }> {
    const encodedPath = encodeURIComponent(path);
    return apiService.delete(`/files/${encodedPath}`);
  }

  async renameFile(from: string, to: string): Promise<{ message: string; from: string; to: string }> {
    return apiService.put('/files/rename', { from, to });
  }

  async createDirectory(path: string, recursive = true): Promise<{ message: string; path: string }> {
    return apiService.post('/files/mkdir', { path, recursive });
  }
}

export const fileService = new FileService();
