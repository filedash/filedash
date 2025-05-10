use crate::errors::ApiError;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use walkdir::WalkDir;
use path_clean::clean;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::os::unix::fs::PermissionsExt;

#[derive(Debug, Serialize)]
pub struct FileMetadata {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub modified: DateTime<Utc>,
    pub permissions: String,
}

pub struct FileService {
    root_dir: PathBuf,
}

impl FileService {
    pub fn new(root_dir: PathBuf) -> Self {
        Self { root_dir }
    }
    
    /// Ensures a path is valid and within the root directory (sandbox)
    fn validate_path(&self, path: &Path) -> Result<PathBuf, ApiError> {
        // Clean the path to remove "..", "." segments
        let clean_path = clean(path.to_string_lossy().to_string());
        let target_path = self.root_dir.join(clean_path);
        
        // Check if the path is within the root directory
        if !target_path.starts_with(&self.root_dir) {
            return Err(ApiError::PathTraversal(
                "Path traversal attempt detected".to_string(),
            ));
        }
        
        Ok(target_path)
    }
    
    /// List files and directories at the specified path
    pub async fn list_directory(&self, path: &Path) -> Result<Vec<FileMetadata>, ApiError> {
        let target_path = self.validate_path(path)?;
        
        if !target_path.exists() {
            return Err(ApiError::NotFound("Directory not found".to_string()));
        }
        
        if !target_path.is_dir() {
            return Err(ApiError::InvalidInput("Path is not a directory".to_string()));
        }
        
        let mut entries = Vec::new();
        
        let read_dir = fs::read_dir(&target_path).await.map_err(|e| {
            ApiError::Internal(format!("Failed to read directory: {}", e))
        })?;
        
        let mut entries_vec = Vec::new();
        
        let mut read_dir = read_dir;
        while let Ok(Some(entry)) = read_dir.next_entry().await {
            entries_vec.push(entry);
        }
        
        for entry in entries_vec {
            let path = entry.path();
            let metadata = fs::metadata(&path).await.map_err(|e| {
                ApiError::Internal(format!("Failed to read metadata: {}", e))
            })?;
            
            let is_dir = metadata.is_dir();
            let size = if is_dir { 0 } else { metadata.len() };
            
            let filename = path.file_name()
                .ok_or_else(|| ApiError::Internal("Invalid file name".to_string()))?
                .to_string_lossy()
                .to_string();
            
            let relative_path = path.strip_prefix(&self.root_dir)
                .map_err(|_| ApiError::Internal("Failed to determine relative path".to_string()))?
                .to_string_lossy()
                .to_string();
            
            // Format permissions in Unix-like format (simplified)
            let mode = metadata.permissions().mode();
            let permissions = format!(
                "{}{}{}{}{}{}{}{}{}{}",
                if is_dir { "d" } else { "-" },
                if mode & 0o400 != 0 { "r" } else { "-" },
                if mode & 0o200 != 0 { "w" } else { "-" },
                if mode & 0o100 != 0 { "x" } else { "-" },
                if mode & 0o040 != 0 { "r" } else { "-" },
                if mode & 0o020 != 0 { "w" } else { "-" },
                if mode & 0o010 != 0 { "x" } else { "-" },
                if mode & 0o004 != 0 { "r" } else { "-" },
                if mode & 0o002 != 0 { "w" } else { "-" },
                if mode & 0o001 != 0 { "x" } else { "-" }
            );
            
            // Convert system time to DateTime<Utc>
            let modified = metadata.modified()
                .map_err(|e| ApiError::Internal(format!("Failed to get modification time: {}", e)))?;
            let modified = DateTime::<Utc>::from(modified);
            
            entries.push(FileMetadata {
                name: filename,
                path: relative_path,
                size,
                is_dir,
                modified,
                permissions,
            });
        }
        
        Ok(entries)
    }
    
    /// Read a file and return its contents
    pub async fn read_file(&self, path: &Path) -> Result<Vec<u8>, ApiError> {
        let target_path = self.validate_path(path)?;
        
        if !target_path.exists() {
            return Err(ApiError::NotFound("File not found".to_string()));
        }
        
        if !target_path.is_file() {
            return Err(ApiError::InvalidInput("Path is not a file".to_string()));
        }
        
        fs::read(&target_path).await.map_err(|e| {
            ApiError::Internal(format!("Failed to read file: {}", e))
        })
    }
    
    /// Write data to a file
    pub async fn write_file(&self, path: &Path, data: Vec<u8>) -> Result<(), ApiError> {
        let target_path = self.validate_path(path)?;
        
        // Create parent directories if they don't exist
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                ApiError::Internal(format!("Failed to create directories: {}", e))
            })?;
        }
        
        let mut file = fs::File::create(&target_path).await.map_err(|e| {
            ApiError::Internal(format!("Failed to create file: {}", e))
        })?;
        
        file.write_all(&data).await.map_err(|e| {
            ApiError::Internal(format!("Failed to write to file: {}", e))
        })?;
        
        Ok(())
    }
    
    /// Delete a file or directory
    pub async fn delete(&self, path: &Path) -> Result<(), ApiError> {
        let target_path = self.validate_path(path)?;
        
        if !target_path.exists() {
            return Err(ApiError::NotFound("Path not found".to_string()));
        }
        
        if target_path.is_dir() {
            fs::remove_dir_all(&target_path).await.map_err(|e| {
                ApiError::Internal(format!("Failed to delete directory: {}", e))
            })?;
        } else {
            fs::remove_file(&target_path).await.map_err(|e| {
                ApiError::Internal(format!("Failed to delete file: {}", e))
            })?;
        }
        
        Ok(())
    }
    
    /// Rename a file or directory
    pub async fn rename(&self, path: &Path, new_name: &str) -> Result<(), ApiError> {
        let target_path = self.validate_path(path)?;
        
        if !target_path.exists() {
            return Err(ApiError::NotFound("Path not found".to_string()));
        }
        
        // Ensure the new name doesn't contain path separators
        if new_name.contains('/') || new_name.contains('\\') {
            return Err(ApiError::InvalidInput("New name contains invalid characters".to_string()));
        }
        
        let parent = target_path.parent()
            .ok_or_else(|| ApiError::Internal("Failed to get parent directory".to_string()))?;
            
        let new_path = parent.join(new_name);
        
        fs::rename(&target_path, &new_path).await.map_err(|e| {
            ApiError::Internal(format!("Failed to rename: {}", e))
        })?;
        
        Ok(())
    }
    
    /// Move a file or directory
    pub async fn move_item(&self, path: &Path, destination: &Path) -> Result<(), ApiError> {
        let source_path = self.validate_path(path)?;
        let dest_path = self.validate_path(destination)?;
        
        if !source_path.exists() {
            return Err(ApiError::NotFound("Source path not found".to_string()));
        }
        
        // Create parent directories if they don't exist
        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                ApiError::Internal(format!("Failed to create directories: {}", e))
            })?;
        }
        
        fs::rename(&source_path, &dest_path).await.map_err(|e| {
            ApiError::Internal(format!("Failed to move: {}", e))
        })?;
        
        Ok(())
    }
}