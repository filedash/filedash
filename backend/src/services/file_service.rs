use crate::{
    config::Config,
    errors::ApiError,
    utils::security::{resolve_path, validate_file_extension, validate_file_size},
};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::Path,
    time::SystemTime,
};
use tokio::fs as async_fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: SystemTime,
    pub is_directory: bool,
    pub mime_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResult {
    pub uploaded: Vec<FileInfo>,
    pub failed: Vec<UploadError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadError {
    pub filename: String,
    pub error: String,
}

pub struct FileService {
    config: Config,
}

impl FileService {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    /// List files and directories in the given path
    pub async fn list_files(&self, path: &str) -> Result<Vec<FileInfo>, ApiError> {
        let resolved_path = resolve_path(&self.config.storage.home_directory, path)?;
        
        if !resolved_path.exists() {
            return Err(ApiError::FileNotFound {
                path: path.to_string(),
            });
        }

        if !resolved_path.is_dir() {
            // If it's a file, return just that file's info
            let file_info = self.get_file_info(&resolved_path, path)?;
            return Ok(vec![file_info]);
        }

        let mut files = Vec::new();
        let entries = async_fs::read_dir(&resolved_path).await?;
        let mut entries = tokio_stream::wrappers::ReadDirStream::new(entries);

        use tokio_stream::StreamExt;
        while let Some(entry) = entries.next().await {
            let entry = entry?;
            let entry_path = entry.path();
            
            // Calculate relative path for the response
            let relative_path = if path.is_empty() || path == "/" {
                entry.file_name().to_string_lossy().to_string()
            } else {
                format!("{}/{}", path.trim_end_matches('/'), entry.file_name().to_string_lossy())
            };

            match self.get_file_info(&entry_path, &relative_path) {
                Ok(file_info) => files.push(file_info),
                Err(e) => {
                    tracing::warn!("Failed to get info for file {:?}: {}", entry_path, e);
                    // Continue with other files
                }
            }
        }

        // Sort files: directories first, then by name
        files.sort_by(|a, b| {
            match (a.is_directory, b.is_directory) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            }
        });

        Ok(files)
    }

    /// Upload a file to the given path
    pub async fn upload_file(
        &self,
        path: &str,
        filename: &str,
        data: Vec<u8>,
    ) -> Result<FileInfo, ApiError> {
        // Validate file extension
        validate_file_extension(filename, &self.config.storage.allowed_extensions)?;
        
        // Validate file size
        validate_file_size(data.len() as u64, self.config.storage.max_upload_size)?;

        let target_dir = resolve_path(&self.config.storage.home_directory, path)?;
        let file_path = target_dir.join(filename);

        // Create directory if it doesn't exist
        if let Some(parent) = file_path.parent() {
            async_fs::create_dir_all(parent).await?;
        }

        // Check if file already exists
        if file_path.exists() {
            return Err(ApiError::FileExists {
                path: file_path.to_string_lossy().to_string(),
            });
        }

        // Write file
        async_fs::write(&file_path, &data).await?;

        // Calculate relative path for response
        let relative_path = if path.is_empty() || path == "/" {
            filename.to_string()
        } else {
            format!("{}/{}", path.trim_end_matches('/'), filename)
        };

        self.get_file_info(&file_path, &relative_path)
    }

    /// Download a file from the given path
    pub async fn download_file(&self, path: &str) -> Result<(Vec<u8>, String), ApiError> {
        let resolved_path = resolve_path(&self.config.storage.home_directory, path)?;
        
        if !resolved_path.exists() {
            return Err(ApiError::FileNotFound {
                path: path.to_string(),
            });
        }

        if resolved_path.is_dir() {
            return Err(ApiError::BadRequest {
                message: "Cannot download a directory".to_string(),
            });
        }

        let data = async_fs::read(&resolved_path).await?;
        let filename = resolved_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("download")
            .to_string();

        Ok((data, filename))
    }

    /// Delete a file or directory
    pub async fn delete_file(&self, path: &str) -> Result<(), ApiError> {
        let resolved_path = resolve_path(&self.config.storage.home_directory, path)?;
        
        if !resolved_path.exists() {
            return Err(ApiError::FileNotFound {
                path: path.to_string(),
            });
        }

        if resolved_path.is_dir() {
            async_fs::remove_dir_all(&resolved_path).await?;
        } else {
            async_fs::remove_file(&resolved_path).await?;
        }

        Ok(())
    }

    /// Create a directory
    pub async fn create_directory(&self, path: &str, recursive: bool) -> Result<FileInfo, ApiError> {
        let resolved_path = resolve_path(&self.config.storage.home_directory, path)?;
        
        // Check if directory already exists
        if resolved_path.exists() {
            if resolved_path.is_dir() {
                return Err(ApiError::BadRequest {
                    message: "Directory already exists".to_string(),
                });
            } else {
                return Err(ApiError::BadRequest {
                    message: "A file with this name already exists".to_string(),
                });
            }
        }

        // Create directory
        if recursive {
            async_fs::create_dir_all(&resolved_path).await?;
        } else {
            async_fs::create_dir(&resolved_path).await?;
        }

        // Return file info for the created directory
        self.get_file_info(&resolved_path, path)
    }

    /// Get file information
    fn get_file_info(&self, file_path: &Path, relative_path: &str) -> Result<FileInfo, ApiError> {
        let metadata = fs::metadata(file_path)?;
        let modified = metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
        let is_directory = metadata.is_dir();
        
        let name = file_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string();

        let mime_type = if !is_directory {
            mime_guess::from_path(file_path).first().map(|mime| mime.to_string())
        } else {
            None
        };

        Ok(FileInfo {
            name,
            path: relative_path.to_string(),
            size: metadata.len(),
            modified,
            is_directory,
            mime_type,
        })
    }
}
