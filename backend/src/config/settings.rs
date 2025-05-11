use serde::{Deserialize, Serialize};
use std::path::{PathBuf, Path};
use std::fs;
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub storage: StorageConfig,
    pub auth: AuthConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageConfig {
    pub home_directory: PathBuf,
    pub allowed_extensions: Vec<String>,
    pub max_upload_size: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub token_expiration: u64, // in seconds
    pub enable_auth: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                port: 8080,
                host: "0.0.0.0".to_string(),
            },
            storage: StorageConfig {
                home_directory: PathBuf::from("./files"),
                allowed_extensions: vec!["*".to_string()], // Allow all by default
                max_upload_size: 1024 * 1024 * 100, // 100 MB default
            },
            auth: AuthConfig {
                jwt_secret: "change_me_in_production".to_string(),
                token_expiration: 86400, // 24 hours
                enable_auth: true,
            },
        }
    }
}

pub fn load_config_from_path(path: &Path) -> Result<Config> {
    if !path.exists() {
        let default_config = Config::default();
        let toml = toml::to_string_pretty(&default_config)?;
        fs::write(path, toml)?;
        return Ok(default_config);
    }

    let config_content = fs::read_to_string(path)?;
    let config: Config = toml::from_str(&config_content)?;
    Ok(config)
}

pub fn load_config() -> Result<Config> {
    load_config_from_path(Path::new("config.toml"))
}