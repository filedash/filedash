mod api;
mod config;
mod errors;
mod middleware;
mod services;
mod utils;

use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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
    let config = config::load_config().expect("Failed to load configuration");
    let port = config.server.port;
    
    // Build our application with routes
    let app = Router::new()
        .nest("/api", api_router())
        // Serve static files (frontend)
        .nest_service("/", ServeDir::new("./frontend_dist"))
        // Fallback for SPA routing
        .fallback(get(|| async { 
            axum::response::Redirect::to("/") 
        }))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    // Run the server
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Starting server on http://{}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();

    Ok(())
}

// API router combining all routes
fn api_router() -> Router {
    Router::new()
        .merge(api::auth::router())
        .merge(api::files::router())
        .merge(api::search::router())
}
