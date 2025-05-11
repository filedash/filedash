use std::net::{SocketAddr, TcpListener};
use std::sync::Arc;
use std::path::Path;
use tokio::sync::oneshot::{self, Sender};
use std::time::Duration;
use tokio::time::sleep;

use filedash::api::auth::AppState;
use filedash::config::load_config_from_path;
use filedash::build_app;

// Find an available port on localhost
fn find_available_port() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind to random port");
    let port = listener.local_addr().expect("Failed to get local address").port();
    drop(listener);
    port
}

// Starts a test server with a specific configuration
// Returns a shutdown channel and the URL
pub async fn start_test_server() -> (Sender<()>, String) {
    // Load test config
    let config_path = Path::new("tests/config/test_config.toml");
    let mut config = load_config_from_path(config_path).unwrap();
    
    // Override port with a randomly assigned one
    config.server.port = find_available_port();
    let port = config.server.port;
    
    // Create app state
    let state = AppState { config: Arc::new(config) };
    
    // Ensure test directory exists
    let files_dir = &state.config.storage.home_directory;
    if !files_dir.exists() {
        std::fs::create_dir_all(files_dir).unwrap();
    }
    
    // Build app with routes
    let app = build_app(state);
    
    // Run server
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    
    // Channel to signal shutdown
    let (tx, rx) = oneshot::channel();
    
    // Spawn server task
    tokio::spawn(async move {
        axum::Server::bind(&addr)
            .serve(app.into_make_service())
            .with_graceful_shutdown(async {
                rx.await.ok();
            })
            .await
            .unwrap();
    });
    
    // Wait for the server to start listening
    sleep(Duration::from_millis(100)).await;
    
    // Return shutdown channel and base URL
    (tx, format!("http://127.0.0.1:{}", port))
}