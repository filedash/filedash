use std::sync::Arc;
use axum::{
    Router,
    routing::get,
    middleware::from_fn_with_state,
};
use tower::ServiceBuilder;
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
    services::{ServeDir, ServeFile},
    timeout::TimeoutLayer,
};
use std::time::Duration;
use std::path::Path;

pub mod api;
pub mod config;
pub mod db;
pub mod errors;
pub mod middleware;
pub mod services;
pub mod utils;

use config::Config;
use db::Database;
use services::AuthService;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub db: Database,
    pub auth_service: Arc<AuthService>,
}

pub async fn create_app(config: Arc<Config>) -> Result<Router, Box<dyn std::error::Error>> {
    // Initialize database
    let database_url = config.database.url.clone();
    let db = Database::new(&database_url).await?;
    
    // Initialize auth service
    let auth_service = Arc::new(AuthService::new(
        db.clone(),
        config.auth.jwt_secret.clone(),
        Some(config.auth.token_expiration_hours),
    ));
    
    // Create shared state
    let state = AppState {
        config: config.clone(),
        db: db.clone(),
        auth_service: auth_service.clone(),
    };
    
    // Build protected API routes (require authentication)
    let protected_files_routes = Router::new()
        .nest("/files", api::files_routes())
        .with_state(state.clone());
        
    let protected_auth_routes = Router::new()
        .nest("/auth", api::auth_protected_routes())
        .with_state(auth_service.clone());
        
    let protected_routes = Router::new()
        .merge(protected_files_routes)
        .merge(protected_auth_routes)
        .route_layer(from_fn_with_state(
            auth_service.clone(),
            middleware::auth::admin_middleware,
        ));
    
    // Build auth routes (no authentication required)
    let auth_routes = Router::new()
        .nest("/auth", api::auth_routes())
        .with_state(auth_service.clone());
    
    // Build API routes
    let api_routes = Router::new()
        .merge(auth_routes)
        .merge(protected_routes);
    
    // Build main application
    let frontend_dir = Path::new(&config.storage.frontend_dist_path);
    let index_file = frontend_dir.join("index.html");
    
    let app = Router::new()
        .route("/health", get(health_check))
        .nest("/api", api_routes)
        // Serve frontend static files with fallback to index.html for SPA routing
        .nest_service("/", ServeDir::new(&config.storage.frontend_dist_path)
            .not_found_service(ServeFile::new(&index_file)))
        .with_state(state)
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive())
                .layer(TimeoutLayer::new(Duration::from_secs(config.server.request_timeout_seconds))) // Configurable timeout
        );
    
    Ok(app)
}

async fn health_check() -> &'static str {
    "OK"
}
