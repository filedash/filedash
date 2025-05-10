use axum::{
  routing::{get, post},
  Router,
  http::StatusCode,
  Json,
  extract::{State, TypedHeader},
  headers::{authorization::Bearer, Authorization},
  middleware::from_fn_with_state,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower::ServiceBuilder;

use crate::errors::ApiError;
use crate::utils::security::{generate_token, verify_token};
use crate::config::Config;
use crate::middleware::auth::auth_middleware;

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

#[derive(Clone)]
pub struct AppState {
  pub config: Arc<Config>,
}

// Create the router for auth endpoints
pub fn router() -> Router<AppState> {
    let public_routes = Router::new()
        .route("/login", post(login_handler))
        .route("/logout", post(logout_handler));

    let protected_routes = Router::new()
        .route("/validate", get(validate_token_handler))
        .route_layer(axum::middleware::from_fn(crate::middleware::auth::auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
}

// Handler for user login
async fn login_handler(
  State(state): State<AppState>,
  Json(payload): Json<LoginRequest>,
) -> Result<Json<TokenResponse>, ApiError> {
  if payload.username == "admin" && payload.password == "password" {
      let token = generate_token(
          &payload.username,
          &state.config.auth.jwt_secret,
          state.config.auth.token_expiration / 3600,
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
  Ok(StatusCode::OK)
}

// Handler to validate JWT token
async fn validate_token_handler(
  State(state): State<AppState>,
  TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
) -> Result<Json<serde_json::Value>, ApiError> {
  let token = auth.token();

  let claims = verify_token(token, &state.config.auth.jwt_secret)?;

  Ok(Json(serde_json::json!({
      "username": claims.sub,
      "valid": true,
      "expires_at": claims.exp
  })))
}
