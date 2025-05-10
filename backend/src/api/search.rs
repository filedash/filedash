use axum::{
    extract::{Query, State},
    routing::get,
    Router,
    Json,
};
use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::services::search_service::SearchService;
use crate::utils::security::sanitize_path;
use crate::api::auth::AppState;
use crate::errors::ApiError;

#[derive(Deserialize)]
pub struct SearchQuery {
    query: String,
    path: Option<String>,
}

#[derive(Serialize)]
pub struct SearchResult {
    path: String,
    name: String,
    is_dir: bool,
    score: f32,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/search", get(search_files))
        // Apply authentication middleware correctly
        .route_layer(axum::middleware::from_fn(crate::middleware::auth::auth_middleware))
}

// Handler for fuzzy file search
async fn search_files(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>
) -> Result<Json<Vec<SearchResult>>, ApiError> {
    let search_service = SearchService::new(
        state.config.storage.home_directory.clone()
    );
    
    // Sanitize and prepare the search path
    let search_path_str = params.path.as_deref()
        .map(sanitize_path);
    
    // Convert string to Path when needed inside the search function
    let search_path = search_path_str.as_deref().map(Path::new);
    
    // Perform the search
    let service_results = search_service.search(&params.query, search_path).await?;
    
    // Convert to API response format
    let results: Vec<SearchResult> = service_results.into_iter()
        .map(|res| SearchResult {
            path: res.path,
            name: res.name,
            is_dir: res.is_dir,
            score: res.score,
        })
        .collect();
    
    Ok(Json(results))
}