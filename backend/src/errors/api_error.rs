use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("File not found: {path}")]
    FileNotFound { path: String },
    
    #[error("File already exists: {path}")]
    FileExists { path: String },
    
    #[error("Invalid path: {path}")]
    InvalidPath { path: String },
    
    #[error("Access denied")]
    AccessDenied,
    
    #[error("File too large: {size} bytes")]
    FileTooLarge { size: u64 },
    
    #[error("Invalid file type: {file_type}")]
    InvalidFileType { file_type: String },
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Internal server error")]
    Internal(#[from] anyhow::Error),
    
    #[error("Bad request: {message}")]
    BadRequest { message: String },
}

#[derive(Serialize, Deserialize)]
struct ErrorResponse {
    error: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<serde_json::Value>,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_code, message, details) = match &self {
            ApiError::FileNotFound { path } => (
                StatusCode::NOT_FOUND,
                "file_not_found",
                self.to_string(),
                Some(serde_json::json!({ "path": path })),
            ),
            ApiError::FileExists { path } => (
                StatusCode::CONFLICT,
                "file_exists",
                self.to_string(),
                Some(serde_json::json!({ "path": path })),
            ),
            ApiError::InvalidPath { path } => (
                StatusCode::BAD_REQUEST,
                "invalid_path",
                self.to_string(),
                Some(serde_json::json!({ "path": path })),
            ),
            ApiError::AccessDenied => (
                StatusCode::FORBIDDEN,
                "access_denied",
                self.to_string(),
                None,
            ),
            ApiError::FileTooLarge { size } => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "file_too_large",
                self.to_string(),
                Some(serde_json::json!({ "size": size })),
            ),
            ApiError::InvalidFileType { file_type } => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "invalid_file_type",
                self.to_string(),
                Some(serde_json::json!({ "file_type": file_type })),
            ),
            ApiError::IoError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "io_error",
                "An IO error occurred".to_string(),
                None,
            ),
            ApiError::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error",
                "An internal error occurred".to_string(),
                None,
            ),
            ApiError::BadRequest { message } => (
                StatusCode::BAD_REQUEST,
                "bad_request",
                message.clone(),
                None,
            ),
        };

        let error_response = ErrorResponse {
            error: error_code.to_string(),
            message,
            details,
        };

        (status, Json(error_response)).into_response()
    }
}
