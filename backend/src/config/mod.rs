pub mod settings;

pub use settings::*;

use anyhow::Result;
use std::path::Path;

pub fn load_config() -> Result<Config> {
    let mut config_builder = config::Config::builder()
        .add_source(config::File::with_name("config"))
        .add_source(config::Environment::with_prefix("FILEDASH").separator("__"));
    
    // Try to load local config file if it exists
    if Path::new("config.local.toml").exists() {
        config_builder = config_builder.add_source(config::File::with_name("config.local"));
    }
    
    let config = config_builder
        .build()?
        .try_deserialize::<Config>()?;
    
    Ok(config)
}
