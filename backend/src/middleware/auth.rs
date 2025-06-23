use crate::{
    db::models::UserRole,
    errors::ApiError,
    services::auth_service::{AuthService},
};
use axum::{
    body::Body,
    extract::State,
    http::{Request, header::AUTHORIZATION},
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct AuthContext {
    pub user_id: Uuid,
    pub email: String,
    pub role: UserRole,
    pub token: String, // Add the token so we can blacklist it specifically
}

impl AuthContext {
    pub fn is_admin(&self) -> bool {
        matches!(self.role, UserRole::Admin)
    }

    pub fn has_role(&self, required_role: &UserRole) -> bool {
        match (required_role, &self.role) {
            (UserRole::User, _) => true,        // User role allows both user and admin
            (UserRole::Admin, UserRole::Admin) => true, // Admin role requires admin
            _ => false,
        }
    }
}

/// Middleware to extract and validate JWT token
pub async fn auth_middleware(
    State(auth_service): State<Arc<AuthService>>,
    mut request: Request<Body>,
    next: Next<Body>,
) -> Result<Response, ApiError> {
    // Extract token from Authorization header
    let token = extract_token_from_header(&request)?;

    // Validate token
    let claims = auth_service.validate_token(&token).await?;

    // Parse user ID
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| ApiError::Unauthorized {
        message: "Invalid user ID in token".to_string(),
    })?;

    // Parse role
    let role: UserRole = claims.role.parse().map_err(|_| ApiError::Unauthorized {
        message: "Invalid role in token".to_string(),
    })?;

    // Create auth context
    let auth_context = AuthContext {
        user_id,
        email: claims.email,
        role,
        token: token.clone(), // Store the token for logout functionality
    };

    // Add auth context to request extensions
    request.extensions_mut().insert(auth_context);

    Ok(next.run(request).await)
}

/// Middleware for admin-only routes
pub async fn admin_middleware(
    State(auth_service): State<Arc<AuthService>>,
    mut request: Request<Body>,
    next: Next<Body>,
) -> Result<Response, ApiError> {
    // First run auth middleware
    let token = extract_token_from_header(&request)?;
    let claims = auth_service.validate_token(&token).await?;

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| ApiError::Unauthorized {
        message: "Invalid user ID in token".to_string(),
    })?;

    let role: UserRole = claims.role.parse().map_err(|_| ApiError::Unauthorized {
        message: "Invalid role in token".to_string(),
    })?;

    // Check if user is admin
    if !matches!(role, UserRole::Admin) {
        return Err(ApiError::Forbidden {
            message: "Admin access required".to_string(),
        });
    }

    let auth_context = AuthContext {
        user_id,
        email: claims.email,
        role,
        token: token.clone(), // Store the token for logout functionality
    };

    request.extensions_mut().insert(auth_context);

    Ok(next.run(request).await)
}

/// Optional auth middleware - doesn't fail if no token provided
pub async fn optional_auth_middleware(
    State(auth_service): State<Arc<AuthService>>,
    mut request: Request<Body>,
    next: Next<Body>,
) -> Response {
    // Try to extract token, but don't fail if not present
    if let Ok(token) = extract_token_from_header(&request) {
        if let Ok(claims) = auth_service.validate_token(&token).await {
            if let Ok(user_id) = Uuid::parse_str(&claims.sub) {
                if let Ok(role) = claims.role.parse::<UserRole>() {
                    let auth_context = AuthContext {
                        user_id,
                        email: claims.email,
                        role,
                        token: token.clone(), // Store the token for logout functionality
                    };
                    request.extensions_mut().insert(auth_context);
                }
            }
        }
    }

    next.run(request).await
}

fn extract_token_from_header(request: &Request<Body>) -> Result<String, ApiError> {
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .ok_or_else(|| ApiError::Unauthorized {
            message: "Missing Authorization header".to_string(),
        })?
        .to_str()
        .map_err(|_| ApiError::Unauthorized {
            message: "Invalid Authorization header format".to_string(),
        })?;

    if !auth_header.starts_with("Bearer ") {
        return Err(ApiError::Unauthorized {
            message: "Authorization header must start with 'Bearer '".to_string(),
        });
    }

    Ok(auth_header.strip_prefix("Bearer ").unwrap().to_string())
}
