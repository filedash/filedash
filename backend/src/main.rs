mod api;
mod config;
mod errors;
mod middleware;
mod services;
mod utils;

use axum::{
    routing::{get, post},
    Router,
    http::StatusCode,
    response::{Html, IntoResponse},
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use crate::api::auth::AppState;

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
    
    // Build our application with routes
    let app = Router::new()
        .nest("/api", api_router())
        // Serve static files (frontend)
        .nest_service("/", ServeDir::new("./frontend_dist"))
        // Fallback for SPA routing
        .fallback(get(serve_index))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Run the server
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Starting FileDash server on http://{}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}

// API router combining all routes
fn api_router() -> Router<AppState> {
    Router::new()
        .merge(api::auth::router())
        .merge(api::files::router())
        .merge(api::search::router())
}

// Serve the index.html for SPA fallback
async fn serve_index() -> impl IntoResponse {
    // Try to serve the index.html file from the static directory
    match tokio::fs::read_to_string("./frontend_dist/index.html").await {
        Ok(content) => Html(content).into_response(),
        Err(_) => (
            StatusCode::NOT_FOUND,
            Html("<html><body><h1>404 - FileDash frontend not found</h1><p>Please build the frontend and place it in the frontend_dist directory.</p></body></html>")
        ).into_response(),
    }
}
