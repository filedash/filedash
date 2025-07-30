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
                    let upload_duration = upload_start.elapsed();
                    uploaded.push(file_info);
                },
                Err(e) => {
                    let upload_duration = upload_start.elapsed();
                    failed.push(UploadError {
                        filename: filename.clone(),
                        error: e.to_string(),
                    });
                }
            }
        }
    }

    let total_duration = start_time.elapsed();
    
    Ok(Json(UploadResponse { uploaded, failed }))
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
    let mut chunk_count = 0u64;
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
        chunk_count += 1;
    }
    
    // Flush and close file
    writer.flush().await.map_err(|e| {
        ApiError::InternalServerError {
            message: format!("Failed to flush file: {}", e),
        }
    })?;
    
    let final_duration = stream_start.elapsed();
    let final_mb = total_bytes as f64 / (1024.0 * 1024.0);
    let final_speed = final_mb / final_duration.as_secs_f64();
    
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
