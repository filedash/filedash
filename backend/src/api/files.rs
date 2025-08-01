use crate::{
    errors::ApiError,
    middleware::AuthContext,
    services::{FileService, FileInfo},
    AppState,
};
use axum::{
    extract::{Extension, Multipart, Path, Query, State, DefaultBodyLimit},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncWriteExt, BufWriter};
use tokio::fs::File;
use futures::StreamExt;
use chrono::{DateTime, Utc};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_files))
        .route("/upload", post(upload_files))
        .route("/upload-folder", post(upload_folder))
        .route("/mkdir", post(create_directory))
        .route("/rename", put(rename_file))
        .route("/*path", delete(delete_file))
        .route("/download/*path", get(download_file))
        .layer(DefaultBodyLimit::max(1000 * 1024 * 1024 * 1024)) 
}

#[derive(Deserialize)]
struct ListQuery {
    path: Option<String>,
}

#[derive(Serialize)]
struct ListResponse {
    files: Vec<FileInfo>,
    path: String,
}

async fn list_files(
    State(app_state): State<AppState>,
    Extension(_auth_context): Extension<AuthContext>,
    Query(query): Query<ListQuery>,
) -> Result<Json<ListResponse>, ApiError> {
    let path = query.path.unwrap_or_else(|| "/".to_string());
    let file_service = FileService::new(app_state.config.as_ref().clone());
    
    let files = file_service.list_files(&path).await?;
    
    Ok(Json(ListResponse { files, path }))
}

#[derive(Deserialize)]
struct CreateDirectoryRequest {
    path: String,
    recursive: Option<bool>,
}

#[derive(Serialize)]
struct CreateDirectoryResponse {
    message: String,
    path: String,
    file_info: FileInfo,
}

async fn create_directory(
    State(app_state): State<AppState>,
    Extension(_auth_context): Extension<AuthContext>,
    Json(request): Json<CreateDirectoryRequest>,
) -> Result<Json<CreateDirectoryResponse>, ApiError> {
    let file_service = FileService::new(app_state.config.as_ref().clone());
    let recursive = request.recursive.unwrap_or(true);
    
    let file_info = file_service.create_directory(&request.path, recursive).await?;
    
    Ok(Json(CreateDirectoryResponse {
        message: "Directory created successfully".to_string(),
        path: request.path,
        file_info,
    }))
}

#[derive(Serialize)]
struct UploadResponse {
    uploaded: Vec<FileInfo>,
    failed: Vec<UploadError>,
}

#[derive(Serialize)]
struct FolderUploadResponse {
    uploaded: Vec<FileInfo>,
    failed: Vec<UploadError>,
    folders_created: Vec<String>,
    total_files: usize,
    successful_files: usize,
    failed_files: usize,
}

#[derive(Serialize)]
struct UploadError {
    filename: String,
    error: String,
}

async fn upload_files(
    State(app_state): State<AppState>,
    Extension(_auth_context): Extension<AuthContext>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, ApiError> {
    let mut uploaded = Vec::new();
    let mut failed = Vec::new();
    let mut target_path = "/".to_string();

    let start_time = std::time::Instant::now();

    // Process fields one by one
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        ApiError::BadRequest {
            message: format!("Invalid multipart data: {}", e),
        }
    })? {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "path" {
            // Extract target path
            let data = field.bytes().await.map_err(|e| {
                ApiError::BadRequest {
                    message: format!("Failed to read path field: {}", e),
                }
            })?;
            target_path = String::from_utf8_lossy(&data).to_string();
        } else if name == "file" {
            // Extract filename
            let filename = field
                .file_name()
                .unwrap_or("unnamed_file")
                .to_string();
            
            // Stream file data directly to disk
            let upload_start = std::time::Instant::now();
            
            match stream_upload_file(&app_state.config, &target_path, &filename, field).await {
                Ok(file_info) => {
                    let _upload_duration = upload_start.elapsed();
                    uploaded.push(file_info);
                },
                Err(e) => {
                    let _upload_duration = upload_start.elapsed();
                    failed.push(UploadError {
                        filename: filename.clone(),
                        error: e.to_string(),
                    });
                }
            }
        }
    }

    let _total_duration = start_time.elapsed();
    
    Ok(Json(UploadResponse { uploaded, failed }))
}

async fn upload_folder(
    State(app_state): State<AppState>,
    Extension(_auth_context): Extension<AuthContext>,
    mut multipart: Multipart,
) -> Result<Json<FolderUploadResponse>, ApiError> {
    let mut uploaded = Vec::new();
    let mut failed = Vec::new();
    let mut folders_created = Vec::new();
    let mut target_path = "/".to_string();
    let mut created_dirs = std::collections::HashSet::new();

    // Collect all files first to determine which are large files
    let mut files_to_process = Vec::new();
    let start_time = std::time::Instant::now();
    
    tracing::info!("Starting folder upload process");

    // First pass: collect all files and the target path
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        ApiError::BadRequest {
            message: format!("Invalid multipart data: {}", e),
        }
    })? {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "path" {
            // Extract target path
            let data = field.bytes().await.map_err(|e| {
                ApiError::BadRequest {
                    message: format!("Failed to read path field: {}", e),
                }
            })?;
            target_path = String::from_utf8_lossy(&data).to_string();
        } else if name == "file" {
            // Extract filename and file data
            let filename = field
                .file_name()
                .unwrap_or("unnamed_file")
                .to_string();
            
            // Read the entire file data to determine size and decide processing method
            let data = field.bytes().await.map_err(|e| {
                ApiError::BadRequest {
                    message: format!("Failed to read file data: {}", e),
                }
            })?;
            
            files_to_process.push((filename, data.to_vec()));
        }
    }

    let total_files = files_to_process.len();
    let large_file_threshold = 5 * 1024 * 1024; // 5MB
    
    // Separate large files from small files
    let mut large_files = Vec::new();
    let mut small_files = Vec::new();
    
    for (filename, data) in files_to_process {
        if data.len() > large_file_threshold {
            large_files.push((filename, data));
        } else {
            small_files.push((filename, data));
        }
    }

    tracing::info!("Processing {} files total: {} large files (>5MB), {} small files - this may take up to 24 hours for very large folders", 
             total_files, large_files.len(), small_files.len());

    println!("Processing {} files: {} large files (>5MB), {} small files", 
             total_files, large_files.len(), small_files.len());

    // Process large files individually using the same logic as upload_files
    for (i, (filename, data)) in large_files.iter().enumerate() {
        let upload_start = std::time::Instant::now();
        
        println!("Uploading large file ({}/{}): {} ({}MB)", 
                i + 1, large_files.len(), filename, data.len() as f64 / (1024.0 * 1024.0));
        
        // Parse the relative path to extract directory structure
        let path_obj = std::path::Path::new(&filename);
        let file_name = path_obj.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unnamed_file");
        
        // Get the directory path within the relative structure
        let dir_path = if let Some(parent) = path_obj.parent() {
            if parent.as_os_str().is_empty() {
                target_path.clone()
            } else {
                format!("{}/{}", target_path.trim_end_matches('/'), parent.to_string_lossy())
            }
        } else {
            target_path.clone()
        };

        // Use the same streaming logic but with the data we already have
        match upload_large_file_data(&app_state.config, &dir_path, file_name, &data, &mut created_dirs).await {
            Ok((file_info, created_dir)) => {
                let upload_duration = upload_start.elapsed();
                uploaded.push(file_info);
                if let Some(dir) = created_dir {
                    if !folders_created.contains(&dir) {
                        folders_created.push(dir);
                    }
                }
                println!("✓ Large file uploaded: {} in {:.2}s", filename, upload_duration.as_secs_f64());
            },
            Err(e) => {
                let upload_duration = upload_start.elapsed();
                failed.push(UploadError {
                    filename: filename.clone(),
                    error: e.to_string(),
                });
                println!("✗ Large file failed: {} - {} (in {:.2}s)", filename, e, upload_duration.as_secs_f64());
            }
        }
    }

    // Process small files in batches using the existing folder structure logic
    if !small_files.is_empty() {
        println!("Processing {} small files in batches", small_files.len());
        
        for (i, (filename, data)) in small_files.iter().enumerate() {
            let upload_start = std::time::Instant::now();
            
            // Progress reporting every 100 files for long uploads
            if (i + 1) % 100 == 0 {
                tracing::info!("Progress: processed {}/{} small files", i + 1, small_files.len());
            }
            
            println!("Uploading small file ({}/{}): {} ({}KB)", 
                    i + 1 + large_files.len(), total_files, filename, data.len() as f64 / 1024.0);
            
            match upload_small_file_data(&app_state.config, &target_path, &filename, &data, &mut created_dirs).await {
                Ok((file_info, created_dir)) => {
                    let upload_duration = upload_start.elapsed();
                    uploaded.push(file_info);
                    if let Some(dir) = created_dir {
                        if !folders_created.contains(&dir) {
                            folders_created.push(dir);
                        }
                    }
                    println!("✓ Small file uploaded: {} in {:.2}s", filename, upload_duration.as_secs_f64());
                },
                Err(e) => {
                    let upload_duration = upload_start.elapsed();
                    failed.push(UploadError {
                        filename: filename.clone(),
                        error: e.to_string(),
                    });
                    println!("✗ Small file failed: {} - {} (in {:.2}s)", filename, e, upload_duration.as_secs_f64());
                }
            }
        }
    }

    let total_duration = start_time.elapsed();
    let total_files = uploaded.len() + failed.len();
    let successful_files = uploaded.len();
    let failed_files = failed.len();
    
    tracing::info!("Folder upload completed: {} total files, {} successful, {} failed in {:.2} minutes", 
                   total_files, successful_files, failed_files, total_duration.as_secs_f64() / 60.0);
    
    Ok(Json(FolderUploadResponse { 
        uploaded, 
        failed, 
        folders_created,
        total_files,
        successful_files,
        failed_files,
    }))
}

async fn stream_upload_file_with_structure(
    config: &crate::config::Config, 
    target_path: &str, 
    relative_path: &str, 
    mut field: axum::extract::multipart::Field<'_>,
    created_dirs: &mut std::collections::HashSet<String>,
) -> Result<(FileInfo, Option<String>), ApiError> {
    use crate::utils::security::resolve_path;
    use std::path::Path;
    
    // Get storage directory from config
    let storage_path = &config.storage.home_directory;
    
    // Parse the relative path to extract directory structure and filename
    let path_obj = Path::new(relative_path);
    let filename = path_obj.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unnamed_file");
    
    // Get the directory path within the relative structure
    let dir_path = if let Some(parent) = path_obj.parent() {
        if parent.as_os_str().is_empty() {
            target_path.to_string()
        } else {
            format!("{}/{}", target_path.trim_end_matches('/'), parent.to_string_lossy())
        }
    } else {
        target_path.to_string()
    };
    
    // Resolve the full target path
    let full_target_path = resolve_path(storage_path, &dir_path).map_err(|e| {
        ApiError::BadRequest {
            message: format!("Invalid target path: {}", e),
        }
    })?;
    
    // Track directory creation for response
    let created_dir = if !created_dirs.contains(&dir_path) && dir_path != target_path {
        created_dirs.insert(dir_path.clone());
        Some(dir_path.clone())
    } else {
        None
    };
    
    // Ensure target directory exists
    tokio::fs::create_dir_all(&full_target_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to create target directory: {}", e),
        }
    })?;
    
    let file_path = full_target_path.join(filename);
    
    // Create file and buffered writer
    let file = File::create(&file_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to create file: {}", e),
        }
    })?;
    
    let mut writer = BufWriter::new(file);
    let mut total_bytes = 0u64;
    let mut _chunk_count = 0u64;
    let stream_start = std::time::Instant::now();
    
    // Stream data in chunks
    while let Some(chunk) = field.next().await {
        let chunk = chunk.map_err(|e| {
            ApiError::BadRequest {
                message: format!("Failed to read file chunk: {}", e),
            }
        })?;
        
        writer.write_all(&chunk).await.map_err(|e| {
            ApiError::InternalServerError {
                message: format!("Failed to write file chunk: {}", e),
            }
        })?;
        
        total_bytes += chunk.len() as u64;
        _chunk_count += 1;
    }
    
    // Flush and close file
    writer.flush().await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to flush file: {}", e),
        }
    })?;
    
    let final_duration = stream_start.elapsed();
    let final_mb = total_bytes as f64 / (1024.0 * 1024.0);
    let _final_speed = final_mb / final_duration.as_secs_f64();
    
    // Get file metadata and create FileInfo
    let metadata = tokio::fs::metadata(&file_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to get file metadata: {}", e),
        }
    })?;
    
    let file_info = FileInfo {
        name: filename.to_string(),
        path: format!("{}/{}", dir_path.trim_end_matches('/'), filename),
        size: metadata.len(),
        is_directory: false,
        modified: metadata.modified()
            .map(|t| DateTime::<Utc>::from(t))
            .unwrap_or_else(|_| Utc::now()),
        mime_type: Some(mime_guess::from_path(filename).first_or_octet_stream().to_string()),
    };
    
    Ok((file_info, created_dir))
}

async fn stream_upload_file(
    config: &crate::config::Config, 
    target_path: &str, 
    filename: &str, 
    mut field: axum::extract::multipart::Field<'_>
) -> Result<FileInfo, ApiError> {
    use crate::utils::security::resolve_path;
    
    // Get storage directory from config
    let storage_path = &config.storage.home_directory;
    
    // Resolve the full target path
    let full_target_path = resolve_path(storage_path, target_path).map_err(|e| {
        ApiError::BadRequest {
            message: format!("Invalid target path: {}", e),
        }
    })?;
    
    // Ensure target directory exists
    tokio::fs::create_dir_all(&full_target_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to create target directory: {}", e),
        }
    })?;
    
    let file_path = full_target_path.join(filename);
    
    // Create file and buffered writer
    let file = File::create(&file_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to create file: {}", e),
        }
    })?;
    
    let mut writer = BufWriter::new(file);
    let mut total_bytes = 0u64;
    let mut _chunk_count = 0u64;
    let stream_start = std::time::Instant::now();
    
    // Stream data in chunks
    while let Some(chunk) = field.next().await {
        let chunk = chunk.map_err(|e| {
            ApiError::BadRequest {
                message: format!("Failed to read file chunk: {}", e),
            }
        })?;
        
        writer.write_all(&chunk).await.map_err(|e| {
            ApiError::InternalServerError {
                message: format!("Failed to write file chunk: {}", e),
            }
        })?;
        
        total_bytes += chunk.len() as u64;
        _chunk_count += 1;
    }
    
    // Flush and close file
    writer.flush().await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to flush file: {}", e),
        }
    })?;
    
    let final_duration = stream_start.elapsed();
    let final_mb = total_bytes as f64 / (1024.0 * 1024.0);
    let _final_speed = final_mb / final_duration.as_secs_f64();
    
    // Get file metadata and create FileInfo
    let metadata = tokio::fs::metadata(&file_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to get file metadata: {}", e),
        }
    })?;
    
    let file_info = FileInfo {
        name: filename.to_string(),
        path: format!("{}/{}", target_path.trim_end_matches('/'), filename),
        size: metadata.len(),
        is_directory: false,
        modified: metadata.modified()
            .map(|t| DateTime::<Utc>::from(t))
            .unwrap_or_else(|_| Utc::now()),
        mime_type: Some(mime_guess::from_path(filename).first_or_octet_stream().to_string()),
    };
    
    Ok(file_info)
}

async fn download_file(
    State(app_state): State<AppState>,
    Extension(_auth_context): Extension<AuthContext>,
    Path(path): Path<String>,
) -> Result<Response, ApiError> {
    let file_service = FileService::new(app_state.config.as_ref().clone());
    let (data, filename) = file_service.download_file(&path).await?;
    
    let headers = [
        (header::CONTENT_TYPE, "application/octet-stream"),
        (
            header::CONTENT_DISPOSITION,
            &format!("attachment; filename=\"{}\"", filename),
        ),
    ];

    Ok((StatusCode::OK, headers, data).into_response())
}

#[derive(Serialize)]
struct DeleteResponse {
    message: String,
    path: String,
}

#[derive(Deserialize)]
struct RenameRequest {
    from: String,
    to: String,
}

#[derive(Serialize)]
struct RenameResponse {
    message: String,
    from: String,
    to: String,
    file_info: FileInfo,
}

async fn delete_file(
    State(app_state): State<AppState>,
    Extension(_auth_context): Extension<AuthContext>,
    Path(path): Path<String>,
) -> Result<Json<DeleteResponse>, ApiError> {
    let file_service = FileService::new(app_state.config.as_ref().clone());
    file_service.delete_file(&path).await?;
    
    Ok(Json(DeleteResponse {
        message: "File deleted successfully".to_string(),
        path,
    }))
}

async fn rename_file(
    State(app_state): State<AppState>,
    Extension(_auth_context): Extension<AuthContext>,
    Json(request): Json<RenameRequest>,
) -> Result<Json<RenameResponse>, ApiError> {
    let file_service = FileService::new(app_state.config.as_ref().clone());
    let file_info = file_service.rename_file(&request.from, &request.to).await?;
    
    Ok(Json(RenameResponse {
        message: "File renamed successfully".to_string(),
        from: request.from,
        to: request.to,
        file_info,
    }))
}

// Helper function to upload large files using pre-loaded data
async fn upload_large_file_data(
    config: &crate::config::Config,
    target_path: &str,
    filename: &str,
    data: &[u8],
    created_dirs: &mut std::collections::HashSet<String>,
) -> Result<(FileInfo, Option<String>), ApiError> {
    use crate::utils::security::resolve_path;
    
    let storage_path = &config.storage.home_directory;
    
    // Resolve the full target path
    let full_target_path = resolve_path(storage_path, target_path).map_err(|e| {
        ApiError::BadRequest {
            message: format!("Invalid target path: {}", e),
        }
    })?;
    
    // Track directory creation for response
    let created_dir = if !created_dirs.contains(target_path) && target_path != "/" {
        created_dirs.insert(target_path.to_string());
        Some(target_path.to_string())
    } else {
        None
    };
    
    // Ensure target directory exists
    tokio::fs::create_dir_all(&full_target_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to create target directory: {}", e),
        }
    })?;
    
    let file_path = full_target_path.join(filename);
    
    // Write file data directly (since we already have it in memory)
    tokio::fs::write(&file_path, data).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to write file: {}", e),
        }
    })?;
    
    // Get file metadata and create FileInfo
    let metadata = tokio::fs::metadata(&file_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to get file metadata: {}", e),
        }
    })?;
    
    let file_info = FileInfo {
        name: filename.to_string(),
        path: format!("{}/{}", target_path.trim_end_matches('/'), filename),
        size: metadata.len(),
        is_directory: false,
        modified: metadata.modified()
            .map(|t| DateTime::<Utc>::from(t))
            .unwrap_or_else(|_| Utc::now()),
        mime_type: Some(mime_guess::from_path(filename).first_or_octet_stream().to_string()),
    };
    
    Ok((file_info, created_dir))
}

// Helper function to upload small files using pre-loaded data with folder structure
async fn upload_small_file_data(
    config: &crate::config::Config,
    target_path: &str,
    relative_path: &str,
    data: &[u8],
    created_dirs: &mut std::collections::HashSet<String>,
) -> Result<(FileInfo, Option<String>), ApiError> {
    use crate::utils::security::resolve_path;
    use std::path::Path;
    
    let storage_path = &config.storage.home_directory;
    
    // Parse the relative path to extract directory structure and filename
    let path_obj = Path::new(relative_path);
    let filename = path_obj.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unnamed_file");
    
    // Get the directory path within the relative structure
    let dir_path = if let Some(parent) = path_obj.parent() {
        if parent.as_os_str().is_empty() {
            target_path.to_string()
        } else {
            format!("{}/{}", target_path.trim_end_matches('/'), parent.to_string_lossy())
        }
    } else {
        target_path.to_string()
    };
    
    // Resolve the full target path
    let full_target_path = resolve_path(storage_path, &dir_path).map_err(|e| {
        ApiError::BadRequest {
            message: format!("Invalid target path: {}", e),
        }
    })?;
    
    // Track directory creation for response
    let created_dir = if !created_dirs.contains(&dir_path) && dir_path != target_path {
        created_dirs.insert(dir_path.clone());
        Some(dir_path.clone())
    } else {
        None
    };
    
    // Ensure target directory exists
    tokio::fs::create_dir_all(&full_target_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to create target directory: {}", e),
        }
    })?;
    
    let file_path = full_target_path.join(filename);
    
    // Write file data directly
    tokio::fs::write(&file_path, data).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to write file: {}", e),
        }
    })?;
    
    // Get file metadata and create FileInfo
    let metadata = tokio::fs::metadata(&file_path).await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to get file metadata: {}", e),
        }
    })?;
    
    let file_info = FileInfo {
        name: filename.to_string(),
        path: format!("{}/{}", dir_path.trim_end_matches('/'), filename),
        size: metadata.len(),
        is_directory: false,
        modified: metadata.modified()
            .map(|t| DateTime::<Utc>::from(t))
            .unwrap_or_else(|_| Utc::now()),
        mime_type: Some(mime_guess::from_path(filename).first_or_octet_stream().to_string()),
    };
    
    Ok((file_info, created_dir))
}
