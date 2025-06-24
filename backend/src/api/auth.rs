use crate::{
    db::models::*,
    errors::ApiError,
    middleware::AuthContext,
    services::auth_service::AuthService,
};
use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::Serialize;
use std::sync::Arc;

pub fn routes() -> Router<Arc<AuthService>> {
    Router::new()
        .route("/login", post(login))
}

pub fn protected_routes() -> Router<Arc<AuthService>> {
    Router::new()
        .route("/logout", post(logout))
        .route("/me", get(get_current_user))
        .route("/register", post(register)) // For admin to create users
}

#[derive(Serialize)]
struct MessageResponse {
    message: String,
}

/// User login endpoint
async fn login(
    State(auth_service): State<Arc<AuthService>>,
    Json(request): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, ApiError> {
    let response = auth_service.login(request).await?;
    Ok(Json(response))
}

/// User logout endpoint
async fn logout(
    State(auth_service): State<Arc<AuthService>>,
    Extension(auth_context): Extension<AuthContext>,
) -> Result<Json<MessageResponse>, ApiError> {
    // Use the specific token from the auth context to log out only this session
    auth_service.logout(&auth_context.token).await?;

    Ok(Json(MessageResponse {
        message: "Successfully logged out".to_string(),
    }))
}

/// Get current user info
async fn get_current_user(
    State(auth_service): State<Arc<AuthService>>,
    Extension(auth_context): Extension<AuthContext>,
) -> Result<Json<UserInfo>, ApiError> {
    let user = auth_service.get_user_by_id(&auth_context.user_id).await?;
    Ok(Json(user))
}

/// Register new user (admin only)
async fn register(
    State(auth_service): State<Arc<AuthService>>,
    Extension(auth_context): Extension<AuthContext>,
    Json(request): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<UserInfo>), ApiError> {
    // Check if user is admin
    if !auth_context.is_admin() {
        return Err(ApiError::Forbidden {
            message: "Admin access required to create users".to_string(),
        });
    }

    let user = auth_service.create_user(request).await?;
    Ok((StatusCode::CREATED, Json(user)))
}
