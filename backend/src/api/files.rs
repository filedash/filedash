use axum::{
    routing::{get, post, put, delete},
    extract::{Path, Query, Multipart, State},
    Router,
    http::{StatusCode, header, Response},
    response::IntoResponse,
    Json,
    body::Full,
};
use serde::{Deserialize, Serialize};
use std::path::{Path as FilePath, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use bytes::Bytes;
use futures::{StreamExt, TryStreamExt};

use crate::errors::ApiError;
use crate::services::file_service::{FileService, FileMetadata};
use crate::utils::security::sanitize_path;
use crate::api::auth::AppState;

// Keep the same FileInfo struct from before for API compatibility
#[derive(Serialize)]
pub struct FileInfo {
    name: String,
    path: String,
    size: u64,
    is_dir: bool,
    modified: String,
    permissions: String,
}

#[derive(Deserialize)]
pub struct ListQuery {
    path: Option<String>,
}

#[derive(Deserialize)]
pub struct RenameRequest {
    new_name: String,
}

#[derive(Deserialize)]
pub struct MoveRequest {
    destination: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        // Protected routes requiring authentication
        .route("/list", get(list_files))
        .route("/download/*path", get(download_file))
        .route("/upload", post(upload_file))
        .route("/rename/*path", put(rename_file))
        .route("/move/*path", put(move_file))
        .route("/delete/*path", delete(delete_file))
        // Apply authentication middleware correctly
        .route_layer(axum::middleware::from_fn(crate::middleware::auth::auth_middleware))
}

// Convert FileMetadata to FileInfo for API response
fn convert_to_file_info(metadata: FileMetadata) -> FileInfo {
    FileInfo {
        name: metadata.name,
        path: metadata.path,
        size: metadata.size,
        is_dir: metadata.is_dir,
        modified: metadata.modified.to_rfc3339(),
        permissions: metadata.permissions,
    }
}

// Handler to list files and directories
async fn list_files(
    State(state): State<AppState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<Vec<FileInfo>>, ApiError> {
    let path = params.path.unwrap_or_else(|| ".".to_string());
    let sanitized_path = sanitize_path(&path);
    
    let file_service = FileService::new(
        state.config.storage.home_directory.clone()
    );
    
    // Get file metadata from service
    let metadata_list = file_service.list_directory(FilePath::new(&sanitized_path)).await?;
    
    // Convert to response format
    let file_info_list = metadata_list
        .into_iter()
        .map(convert_to_file_info)
        .collect();
    
    Ok(Json(file_info_list))
}

// Handler to download a file
async fn download_file(
    State(state): State<AppState>,
    Path(path): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let sanitized_path = sanitize_path(&path);
    let file_service = FileService::new(
        state.config.storage.home_directory.clone()
    );
    
    // Get file contents from service
    let file_data = file_service.read_file(FilePath::new(&sanitized_path)).await?;
    
    // Get file name for the Content-Disposition header
    let path_buf = PathBuf::from(&sanitized_path);
    let file_name = path_buf
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("download")
        .to_string();
    
    let disposition = format!("attachment; filename=\"{}\"", file_name);
    
    // Convert to owned header values
    let content_type = header::HeaderValue::from_static("application/octet-stream");
    let content_disposition = header::HeaderValue::from_str(&disposition)
        .map_err(|_| ApiError::Internal("Failed to create header value".to_string()))?;
    
    // Build response with headers
    let mut response = Response::new(Full::from(file_data));
    let headers = response.headers_mut();
    headers.insert(header::CONTENT_TYPE, content_type);
    headers.insert(header::CONTENT_DISPOSITION, content_disposition);
    
    Ok(response)
}

// Save upload file chunk
async fn save_file_chunk(
    file_path: PathBuf,
    data: Bytes,
    is_first_chunk: bool,
) -> Result<(), ApiError> {
    // Create the parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).await.map_err(|e| {
            ApiError::Internal(format!("Failed to create directory: {}", e))
        })?;
    }
    
    // Create file options with appropriate mode
    let mut options = fs::OpenOptions::new();
    options.write(true).create(true);
    
    if is_first_chunk {
        options.truncate(true);
    } else {
        options.append(true);
    }
    
    // Open the file with the constructed options
    let mut file = options.open(&file_path).await.map_err(|e| {
        ApiError::Internal(format!("Failed to open file: {}", e))
    })?;
    
    // Write the chunk
    file.write_all(&data).await.map_err(|e| {
        ApiError::Internal(format!("Failed to write file: {}", e))
    })?;
    
    Ok(())
}

// Handler to upload a file
async fn upload_file(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, ApiError> {
    let file_service = FileService::new(
        state.config.storage.home_directory.clone()
    );
    
    // Track if this is the first chunk of the file
    let mut is_first_chunk = true;
    let mut target_path = None;
    let mut total_bytes = 0u64;
    
    // Process each field in the multipart form
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        ApiError::InvalidInput(format!("Failed to process multipart form: {}", e))
    })? {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "path" {
            // Get the target path from the form
            let path_str = field.text().await.map_err(|e| {
                ApiError::InvalidInput(format!("Failed to read path field: {}", e))
            })?;
            
            let sanitized_path = sanitize_path(&path_str);
            target_path = Some(sanitized_path);
        } else if name == "file" {
            // Get the target path if it exists
            let path = target_path.clone().unwrap_or_else(|| {
                // If no path was provided, use the file name
                let file_name = field.file_name().unwrap_or("upload.bin").to_string();
                sanitize_path(&file_name)
            });
            
            // Create the full path
            let full_path = state.config.storage.home_directory.join(&path);
            
            // Stream and save the file data
            let mut byte_counter = 0u64;
            let mut data_stream = field.map_err(|e| {
                ApiError::Internal(format!("Failed to read upload data: {}", e))
            });
            
            // Process each chunk of data
            while let Some(chunk) = data_stream.next().await {
                let data = chunk?;
                let chunk_size = data.len() as u64;
                
                // Check if upload size exceeds the maximum
                byte_counter += chunk_size;
                if byte_counter > state.config.storage.max_upload_size as u64 {
                    return Err(ApiError::InvalidInput(
                        format!("Upload size exceeds the maximum of {} bytes", 
                                state.config.storage.max_upload_size)
                    ));
                }
                
                // Save the chunk
                save_file_chunk(full_path.clone(), data, is_first_chunk).await?;
                is_first_chunk = false;
            }
            
            total_bytes += byte_counter;
        }
    }
    
    // Return success with file info
    Ok(Json(serde_json::json!({
        "success": true,
        "bytes_written": total_bytes,
        "path": target_path.unwrap_or_else(|| "unknown".to_string())
    })))
}

// Handler to rename a file or directory
async fn rename_file(
    State(state): State<AppState>,
    Path(path): Path<String>,
    Json(request): Json<RenameRequest>,
) -> Result<StatusCode, ApiError> {
    let sanitized_path = sanitize_path(&path);
    let file_service = FileService::new(
        state.config.storage.home_directory.clone()
    );
    
    file_service.rename(
        FilePath::new(&sanitized_path), 
        &request.new_name
    ).await?;
    
    Ok(StatusCode::OK)
}

// Handler to move a file or directory
async fn move_file(
    State(state): State<AppState>,
    Path(path): Path<String>,
    Json(request): Json<MoveRequest>,
) -> Result<StatusCode, ApiError> {
    let source_path = sanitize_path(&path);
    let destination_path = sanitize_path(&request.destination);
    
    let file_service = FileService::new(
        state.config.storage.home_directory.clone()
    );
    
    file_service.move_item(
        FilePath::new(&source_path),
        FilePath::new(&destination_path)
    ).await?;
    
    Ok(StatusCode::OK)
}

// Handler to delete a file or directory
async fn delete_file(
    State(state): State<AppState>,
    Path(path): Path<String>,
) -> Result<StatusCode, ApiError> {
    let sanitized_path = sanitize_path(&path);
    
    let file_service = FileService::new(
        state.config.storage.home_directory.clone()
    );
    
    file_service.delete(FilePath::new(&sanitized_path)).await?;
    
    Ok(StatusCode::OK)
}