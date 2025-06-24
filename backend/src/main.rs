use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use filedash::config;
use filedash::create_app;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Arc::new(config::load_config().expect("Failed to load configuration"));
    let port = config.server.port;
    let host = config.server.host.clone();
    
    // Create files directory if it doesn't exist
    let files_dir = &config.storage.home_directory;
    if !files_dir.exists() {
        std::fs::create_dir_all(files_dir)
            .expect("Failed to create file storage directory");
        tracing::info!("Created storage directory: {:?}", files_dir);
    }
    
    // Build application with routes (async now due to database initialization)
    let app = create_app(config).await?;

    // Run the server
    let addr = SocketAddr::from((
        host.parse::<std::net::IpAddr>().unwrap_or([0, 0, 0, 0].into()),
        port
    ));
    tracing::info!("Starting FileDash server on http://{}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}
