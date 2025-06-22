use std::sync::Arc;
use axum::{
    Router,
    routing::get,
};
use tower::ServiceBuilder;
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
    services::ServeDir,
};

pub mod api;
pub mod config;
pub mod errors;
pub mod services;
pub mod utils;

use config::Config;

pub type AppState = Arc<Config>;

pub fn build_app(config: Arc<Config>) -> Router {
    // Create shared state
    let state = config.clone();
    
    // Build API routes
    let api_routes = Router::new()
        .nest("/files", api::files::routes())
        .with_state(state.clone());
    
    // Build main application
    Router::new()
        .route("/health", get(health_check))
        .nest("/api", api_routes)
        // Serve static files (frontend)
        .nest_service("/", ServeDir::new(&config.storage.frontend_dist_path))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive())
        )
        .with_state(state)
}

async fn health_check() -> &'static str {
    "OK"
}
