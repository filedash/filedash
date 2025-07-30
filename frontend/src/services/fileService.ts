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

  async uploadFolder(files: File[], path?: string, onProgress?: (progress: number) => void): Promise<FolderUploadResponse> {
    const targetPath = path || '/';
    
    // More aggressive batching for better speed
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageFileSize = totalSize / files.length;
    const MAX_BATCH_SIZE_MB = 100; // Increased to 100MB per batch
    const MIN_BATCH_SIZE = 5;
    const MAX_BATCH_SIZE = 25; // Increased max batch size
    const BATCH_SIZE = Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, Math.floor((MAX_BATCH_SIZE_MB * 1024 * 1024) / averageFileSize)));
    
    const MAX_RETRIES = 2; // Reduced retries for speed
    const CONCURRENT_BATCHES = 3; // Process multiple batches concurrently
    
    let allUploaded: any[] = [];
    let allFailed: any[] = [];
    let allFoldersCreated: string[] = [];
    let totalFiles = files.length;
    let processedFiles = 0;

    console.log(`Uploading ${totalFiles} files with optimized batching: ${BATCH_SIZE} files per batch, ${CONCURRENT_BATCHES} concurrent batches (avg file size: ${(averageFileSize / 1024).toFixed(1)}KB)`);

    // Group files by directory but flatten small directories for better batching
    const filesByDirectory = new Map<string, File[]>();
    
    files.forEach(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const directory = relativePath.includes('/') ? relativePath.substring(0, relativePath.lastIndexOf('/')) : '';
      
      if (!filesByDirectory.has(directory)) {
        filesByDirectory.set(directory, []);
      }
      filesByDirectory.get(directory)!.push(file);
    });

    // Sort directories by depth but group small directories together
    const sortedDirectories = Array.from(filesByDirectory.keys()).sort((a, b) => {
      const depthA = a.split('/').length;
      const depthB = b.split('/').length;
      return depthA - depthB;
    });

    // Create batches across directories for better parallelization
    const allBatches: { batch: File[], directoryInfo: string }[] = [];
    
    for (const directory of sortedDirectories) {
      const directoryFiles = filesByDirectory.get(directory)!;
      
      for (let i = 0; i < directoryFiles.length; i += BATCH_SIZE) {
        const batch = directoryFiles.slice(i, i + BATCH_SIZE);
        allBatches.push({
          batch,
          directoryInfo: directory || 'root'
        });
      }
    }

    console.log(`Created ${allBatches.length} batches for parallel processing`);

    // Process batches with controlled concurrency
    for (let i = 0; i < allBatches.length; i += CONCURRENT_BATCHES) {
      const concurrentBatches = allBatches.slice(i, i + CONCURRENT_BATCHES);
      
      // Process multiple batches concurrently
      const batchPromises = concurrentBatches.map(async ({ batch, directoryInfo }) => {
        let retryCount = 0;
        let success = false;
        let result: any = null;

        while (retryCount < MAX_RETRIES && !success) {
          try {
            result = await this.uploadFolderBatch(batch, targetPath);
            success = true;
          } catch (error) {
            retryCount++;
            console.warn(`Batch upload attempt ${retryCount} failed for ${directoryInfo}:`, error);
            
            if (retryCount >= MAX_RETRIES) {
              // Mark all files in this batch as failed
              result = {
                uploaded: [],
                failed: batch.map(file => ({
                  filename: (file as any).webkitRelativePath || file.name,
                  error: `Upload failed after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Network error'}`
                })),
                folders_created: []
              };
            } else {
              // Shorter wait for retries to maintain speed
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
          allFailed.push(...result.failed);
          
          // Merge folders created, avoiding duplicates
          result.folders_created.forEach((folder: string) => {
            if (!allFoldersCreated.includes(folder)) {
              allFoldersCreated.push(folder);
            }
          });
        }
        
        processedFiles += batchSize;
        
        // Update progress
        if (onProgress) {
          const progress = Math.round((processedFiles / totalFiles) * 100);
          onProgress(progress);
        }
      });

      // Minimal delay between concurrent batch groups
      if (i + CONCURRENT_BATCHES < allBatches.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return {
      uploaded: allUploaded,
      failed: allFailed,
      folders_created: allFoldersCreated,
      total_files: totalFiles,
      successful_files: allUploaded.length,
      failed_files: allFailed.length,
    };
  }

  private async uploadFolderBatch(files: File[], targetPath: string): Promise<FolderUploadResponse> {
    const formData = new FormData();
    
    formData.append('path', targetPath);
    
    // For folder uploads, we need to preserve the relative path structure
    files.forEach(file => {
      // Use the webkitRelativePath if available (for folder uploads)
      const relativePath = (file as any).webkitRelativePath || file.name;
      
      // Create a new File object with the relative path as the name
      const fileWithPath = new File([file], relativePath, { type: file.type });
      formData.append('file', fileWithPath);
    });

    return apiService.uploadFile<FolderUploadResponse>('/files/upload-folder', formData);
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
