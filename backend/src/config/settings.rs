use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub storage: StorageConfig,
    pub auth: AuthConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
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
pub struct AuthConfig {
    pub jwt_secret: String,
    pub token_expiration: u64,
    pub enable_auth: bool,
}

fn default_frontend_dist_path() -> PathBuf {
    PathBuf::from("frontend_dist")
}
