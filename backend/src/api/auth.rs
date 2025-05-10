use axum::{
    routing::{get, post},
    Router,
    http::StatusCode,
    Json,
    extract::{State, TypedHeader},
    headers::{authorization::Bearer, Authorization},
};
use serde::{Deserialize, Serialize};
use crate::middleware::auth::auth_middleware;
use crate::errors::ApiError;
use crate::utils::security::{generate_token, verify_token};
use crate::config::Config;
use std::sync::Arc;

#[derive(Serialize)]
pub struct TokenResponse {
    token: String,
    expires_in: u64,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

// App state containing shared configuration
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login_handler))
        .route("/logout", post(logout_handler))
        .route("/validate", get(validate_token_handler))
}

// Handler for user login
async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<TokenResponse>, ApiError> {
    // In a real app, this would validate credentials against a database
    // For now, we'll use a simple check for demo purposes
    if payload.username == "admin" && payload.password == "password" {
        // Generate a JWT token
        let token = generate_token(
            &payload.username,
            &state.config.auth.jwt_secret,
            state.config.auth.token_expiration / 3600, // Convert seconds to hours
        )?;
        
        Ok(Json(TokenResponse {
            token,
            expires_in: state.config.auth.token_expiration,
        }))
    } else {
        Err(ApiError::Authentication("Invalid username or password".to_string()))
    }
}

// Handler for user logout 
async fn logout_handler() -> Result<StatusCode, ApiError> {
    // In a real app, you might add the token to a blacklist or invalidate it
    // Since JWTs are stateless, client-side logout is typically sufficient
    Ok(StatusCode::OK)
}

// Handler to validate JWT token
async fn validate_token_handler(
    State(state): State<AppState>,
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let token = auth.token();
    
    // Verify the token is valid
    let claims = verify_token(token, &state.config.auth.jwt_secret)?;
    
    // Return user info from token
    Ok(Json(serde_json::json!({
        "username": claims.sub,
        "valid": true,
        "expires_at": claims.exp
    })))
}