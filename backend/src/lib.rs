pub mod api;
pub mod config;
pub mod errors;
pub mod middleware;
pub mod services;
pub mod utils;

use axum::{
    routing::get,
    Router,
    http::StatusCode,
    response::{Html, IntoResponse},
};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use crate::api::auth::AppState;

// Build the application with routes - exposed for testing
pub fn build_app(state: AppState) -> Router {
    Router::new()
        .nest("/api", api_router())
        // Serve static files (frontend)
        .nest_service("/", ServeDir::new("./frontend_dist"))
        // Fallback for SPA routing
        .fallback(get(serve_index))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state)
}

// API router combining all routes
pub fn api_router() -> Router<AppState> {
    Router::new()
        .merge(api::auth::router())
        .merge(api::files::router())
        .merge(api::search::router())
}

// Serve the index.html for SPA fallback
pub async fn serve_index() -> impl IntoResponse {
    // Try to serve the index.html file from the static directory
    match tokio::fs::read_to_string("./frontend_dist/index.html").await {
        Ok(content) => Html(content).into_response(),
        Err(_) => (
            StatusCode::NOT_FOUND,
            Html("<html><body><h1>404 - FileDash frontend not found</h1><p>Please build the frontend and place it in the frontend_dist directory.</p></body></html>")
        ).into_response(),
    }
}