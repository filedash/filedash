use axum::{
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
    extract::TypedHeader,
    headers::{authorization::Bearer, Authorization},
};
use std::sync::Arc;

// This is a placeholder for JWT verification logic
pub async fn verify_token(token: &str) -> bool {
    // In a real implementation, this would verify the JWT token
    // against the secret key and check for expiration
    token.starts_with("valid_") // Simple placeholder
}

// Authentication middleware implementation
pub async fn auth_layer<B>(
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    request: Request<B>,
    next: Next<B>,
) -> Result<Response, StatusCode> {
    // Extract the token from the Authorization header
    let token = auth.token();
    
    // Verify the token
    if verify_token(token).await {
        // If token is valid, continue to the handler
        Ok(next.run(request).await)
    } else {
        // If token is invalid, return 401 Unauthorized
        Err(StatusCode::UNAUTHORIZED)
    }
}

// Function to create the auth middleware
pub fn auth_middleware() -> axum::middleware::from_fn_with_state<
    Arc<()>,
    fn(
        TypedHeader<Authorization<Bearer>>,
        Request<axum::body::Body>,
        Next<axum::body::Body>,
    ) -> futures::future::BoxFuture<'static, Result<Response, StatusCode>>,
    Arc<()>,
> {
    axum::middleware::from_fn_with_state(Arc::new(()), |state, auth, req, next| {
        Box::pin(async move {
            auth_layer(auth, req, next).await
        })
    })
}