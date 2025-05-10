use axum::{
    extract::{State, TypedHeader},
    headers::{authorization::Bearer, Authorization},
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use std::sync::Arc;

use crate::api::auth::AppState;
use crate::utils::security::verify_token;
use crate::errors::ApiError;

// Authentication middleware implementation
pub async fn auth_layer<B>(
    State(state): State<AppState>,
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    request: Request<B>,
    next: Next<B>,
) -> Result<Response, ApiError> {
    // Extract the token from the Authorization header
    let token = auth.token();
    
    // Skip authentication if disabled in config
    if !state.config.auth.enable_auth {
        return Ok(next.run(request).await);
    }
    
    // Verify the token against our JWT secret
    match verify_token(token, &state.config.auth.jwt_secret) {
        Ok(_claims) => {
            // If token is valid, continue to the handler
            Ok(next.run(request).await)
        }
        Err(err) => {
            // If token verification failed, return the error
            Err(err)
        }
    }
}

// Function to create the auth middleware
pub fn auth_middleware() -> axum::middleware::from_fn_with_state<
    AppState,
    fn(
        State<AppState>,
        TypedHeader<Authorization<Bearer>>,
        Request<axum::body::Body>,
        Next<axum::body::Body>,
    ) -> futures::future::BoxFuture<'static, Result<Response, ApiError>>,
    AppState,
> {
    axum::middleware::from_fn_with_state(|state, auth, req, next| {
        Box::pin(async move {
            auth_layer(state, auth, req, next).await
        })
    })
}