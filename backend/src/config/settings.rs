use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub storage: StorageConfig,
    pub database: DatabaseConfig,
    pub auth: AuthConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    #[serde(default = "default_request_timeout_seconds")]
    pub request_timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub home_directory: PathBuf,
    pub allowed_extensions: Vec<String>,
    pub max_upload_size: u64,
    #[serde(default = "default_frontend_dist_path")]
    pub frontend_dist_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    #[serde(default = "default_database_url")]
    pub url: String,
    #[serde(default = "default_max_connections")]
    pub max_connections: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    #[serde(default = "default_token_expiration_hours")]
    pub token_expiration_hours: i64,
    #[serde(default = "default_enable_auth")]
    pub enable_auth: bool,
}

fn default_frontend_dist_path() -> PathBuf {
    PathBuf::from("frontend_dist")
}

fn default_database_url() -> String {
    "sqlite://filedash.db".to_string()
}

fn default_max_connections() -> u32 {
    10
}

fn default_token_expiration_hours() -> i64 {
    24
}

fn default_enable_auth() -> bool {
    true
}

fn default_request_timeout_seconds() -> u64 {
    // Allow environment variable override for extreme cases
    std::env::var("FILEDASH_REQUEST_TIMEOUT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(86400) // 24 hours default timeout for folder uploads with multiple files
}
