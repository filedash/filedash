use crate::{
    errors::ApiError,
    middleware::AuthContext,
    services::{FileService, FileInfo},
    AppState,
};
use axum::{
    extract::{Extension, Multipart, Path, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_files))
        .route("/upload", post(upload_files))
        .route("/mkdir", post(create_directory))
        .route("/rename", put(rename_file))
        .route("/download/*path", get(download_file))
        .route("/*path", delete(delete_file))
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

struct FileUpload {
    filename: String,
    data: Vec<u8>,
}

async fn upload_files(
    State(app_state): State<AppState>,
    Extension(_auth_context): Extension<AuthContext>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, ApiError> {
    let file_service = FileService::new(app_state.config.as_ref().clone());
    let mut uploaded = Vec::new();
    let mut failed = Vec::new();
    let mut target_path = "/".to_string();
    let mut files_to_upload = Vec::new();

    // First pass: collect all fields
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
            
            // Extract file data
            let data = field.bytes().await.map_err(|e| {
                ApiError::BadRequest {
                    message: format!("Failed to read file data: {}", e),
                }
            })?;

            files_to_upload.push(FileUpload { filename, data: data.to_vec() });
        }
    }

    // Second pass: upload all files to the target path
    for file_upload in files_to_upload {
        match file_service.upload_file(&target_path, &file_upload.filename, file_upload.data).await {
            Ok(file_info) => {
                uploaded.push(file_info);
            },
            Err(e) => {
                failed.push(UploadError {
                    filename: file_upload.filename,
                    error: e.to_string(),
                });
            }
        }
    }

    Ok(Json(UploadResponse { uploaded, failed }))
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
