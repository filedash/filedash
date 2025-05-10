use axum::{
    extract::{TypedHeader},
    headers::{authorization::Bearer, Authorization},
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};

use crate::api::auth::AppState;
use crate::utils::security::verify_token;

// Authentication middleware function
pub async fn auth_middleware<B>(
    // Extract the authorization header if present
    auth_header: Option<TypedHeader<Authorization<Bearer>>>,
    // Access the request
    request: Request<B>,
    next: Next<B>,
) -> Response {
    // Extract the app state from request extensions
    let state = request.extensions().get::<AppState>().cloned();
    
    // Skip authentication if state is missing or auth is disabled
    if let Some(ref app_state) = state {
        if !app_state.config.auth.enable_auth {
            return next.run(request).await;
        }
    } else {
        // If we can't access the state, let the request proceed
        // This shouldn't happen in normal operation
        return next.run(request).await;
    }
    
    // Check if auth header is present
    let Some(TypedHeader(auth)) = auth_header else {
        return (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "error": {
                    "message": "Authentication required",
                    "status": 401
                }
            }))
        ).into_response();
    };
    
    // Get token from header
    let token = auth.token();
    
    // Get JWT secret from state
    let jwt_secret = state
        .map(|s| s.config.auth.jwt_secret.clone())
        .unwrap_or_else(|| "default_secret".to_string());
    
    // Verify the token
    match verify_token(token, &jwt_secret) {
        Ok(_) => {
            // If token is valid, continue to the handler
            next.run(request).await
        }
        Err(_) => {
            // If verification failed, return an error
            (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "Invalid authentication token",
                        "status": 401
                    }
                }))
            ).into_response()
        }
    }
}