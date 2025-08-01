import { apiService } from './api';
import type { FileListResponse, UploadResponse, FolderUploadResponse } from '../types/file';

export class FileService {
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
    // For large numbers of files, use optimized batching
    if (files.length > 15) {
      return this.uploadFilesInBatches(files, path, onProgress);
    }

    const formData = new FormData();
    
    const targetPath = path || '/';
    formData.append('path', targetPath);
    
    files.forEach(file => formData.append('file', file));

    return apiService.uploadFile('/files/upload', formData, onProgress);
  }

  private async uploadFilesInBatches(files: File[], path?: string, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const BATCH_SIZE = 20; // Increased batch size
    const targetPath = path || '/';
    const MAX_RETRIES = 2; // Reduced retries for speed
    const CONCURRENT_BATCHES = 3; // Process multiple batches concurrently
    
    let allUploaded: any[] = [];
    let allErrors: string[] = [];
    let processedFiles = 0;

    // Create batches
    const batches: File[][] = [];
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }

    console.log(`Uploading ${files.length} files in ${batches.length} batches with ${CONCURRENT_BATCHES} concurrent uploads`);

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
      
      const batchPromises = concurrentBatches.map(async (batch) => {
        let retryCount = 0;
        let success = false;
        let result: any = null;

        while (retryCount < MAX_RETRIES && !success) {
          try {
            const formData = new FormData();
            formData.append('path', targetPath);
            batch.forEach(file => formData.append('file', file));

            result = await apiService.uploadFile<UploadResponse>('/files/upload', formData);
            success = true;
          } catch (error) {
            retryCount++;
            console.warn(`File batch upload attempt ${retryCount} failed:`, error);
            
            if (retryCount >= MAX_RETRIES) {
              // Mark all files in this batch as failed
              result = {
                uploaded: [],
                errors: batch.map(file => `${file.name}: Upload failed after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Network error'}`)
              };
            } else {
              // Shorter wait for retries
              await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            }
          }
        }

        return { result, batchSize: batch.length };
      });

      // Wait for all concurrent batches to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Aggregate results
      batchResults.forEach(({ result, batchSize }) => {
        if (result) {
          allUploaded.push(...result.uploaded);
          allErrors.push(...result.errors);
        }
        
        processedFiles += batchSize;
        
        // Update progress
        if (onProgress) {
          const progress = Math.round((processedFiles / files.length) * 100);
          onProgress(progress);
        }
      });

      // Minimal delay between concurrent batch groups
      if (i + CONCURRENT_BATCHES < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return {
      uploaded: allUploaded,
      errors: allErrors
    };
  }

  async uploadFolder(files: File[], path?: string, onProgress?: (progress: number, currentFile?: string) => void): Promise<FolderUploadResponse> {
    const targetPath = path || '/';
    
    // Simple approach: let backend handle all the logic for large vs small files
    const formData = new FormData();
    formData.append('path', targetPath);
    
    // Collect file information for progress tracking
    const fileList: { name: string, size: number, relativePath: string }[] = [];
    
    // For folder uploads, we need to preserve the relative path structure
    files.forEach(file => {
      // Use the webkitRelativePath if available (for folder uploads)
      const relativePath = (file as any).webkitRelativePath || file.name;
      
      fileList.push({
        name: file.name,
        size: file.size,
        relativePath: relativePath
      });
      
      // Create a new File object with the relative path as the name
      const fileWithPath = new File([file], relativePath, { type: file.type });
      formData.append('file', fileWithPath);
    });

    // Sort files by size (large files first) to match backend processing order
    const sortedFiles = [...fileList].sort((a, b) => {
      const largeFileThreshold = 5 * 1024 * 1024; // 5MB
      const aIsLarge = a.size > largeFileThreshold;
      const bIsLarge = b.size > largeFileThreshold;
      
      if (aIsLarge && !bIsLarge) return -1;
      if (!aIsLarge && bIsLarge) return 1;
      return 0; // Keep original order within same category
    });

    console.log(`Uploading ${files.length} files - backend will handle large file separation automatically`);

    // Custom progress simulation based on file processing order
    let processedFiles = 0;
    const totalFiles = files.length;
    
    // Start a progress simulation that matches backend processing
    const progressInterval = setInterval(() => {
      if (processedFiles < totalFiles && onProgress) {
        const currentFile = sortedFiles[processedFiles];
        const progress = Math.round((processedFiles / totalFiles) * 100);
        
        if (currentFile) {
          onProgress(progress, `Processing ${currentFile.relativePath} (${currentFile.size > 5*1024*1024 ? 'large file' : 'small file'})`);
        }
        
        processedFiles++;
      }
    }, 500); // Update every 500ms to simulate processing time

    try {
      const result = await apiService.uploadFile<FolderUploadResponse>('/files/upload-folder', formData, (progress) => {
        // Use the API progress for final completion
        if (onProgress && progress > 90) {
          clearInterval(progressInterval);
          onProgress(progress, 'Finalizing upload...');
        }
      });
      
      clearInterval(progressInterval);
      
      // Final progress update
      if (onProgress) {
        onProgress(100, `Completed! Uploaded ${result.successful_files} files, created ${result.folders_created.length} folders`);
      }
      
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
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

  async createFolder(parentPath: string, folderName: string): Promise<{ message: string; path: string }> {
    const fullPath = parentPath === '/' ? `/${folderName}` : `${parentPath}/${folderName}`;
    return this.createDirectory(fullPath, true);
  }
}

export const fileService = new FileService();
