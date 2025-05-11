use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use filedash::api::auth::AppState;
use filedash::config;
use filedash::build_app;

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
    
    // Create app state to share across handlers
    let state = AppState { config };
    
    // Create files directory if it doesn't exist
    let files_dir = &state.config.storage.home_directory;
    if !files_dir.exists() {
        std::fs::create_dir_all(files_dir)
            .expect("Failed to create file storage directory");
        tracing::info!("Created storage directory: {:?}", files_dir);
    }
    
    // Build application with routes
    let app = build_app(state);

    // Run the server
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Starting FileDash server on http://{}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}
