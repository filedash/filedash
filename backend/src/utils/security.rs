use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use crate::errors::ApiError;

// JWT Claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,    // Subject (username)
    pub exp: u64,       // Expiration time
    pub iat: u64,       // Issued at
}

// Hash a password using Argon2
pub fn hash_password(password: &str) -> Result<String, ApiError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| ApiError::Internal(format!("Password hashing failed: {}", e)))
}

// Verify a password against a hash
pub fn verify_password(password: &str, hash: &str) -> Result<bool, ApiError> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| ApiError::Internal(format!("Invalid password hash: {}", e)))?;
    
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

// Generate a JWT token
pub fn generate_token(username: &str, secret: &str, expiry_hours: u64) -> Result<String, ApiError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();
    
    let expiry = now + (expiry_hours * 3600); // Convert hours to seconds
    
    let claims = Claims {
        sub: username.to_string(),
        exp: expiry,
        iat: now,
    };
    
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| ApiError::Internal(format!("Token generation failed: {}", e)))
}

// Verify and decode a JWT token
pub fn verify_token(token: &str, secret: &str) -> Result<Claims, ApiError> {
    decode(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|token_data| token_data.claims)
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
            ApiError::Authentication("Token expired".to_string())
        }
        _ => ApiError::Authentication(format!("Invalid token: {}", e)),
    })
}

// Create a sanitized and normalized path
pub fn sanitize_path(path: &str) -> String {
    // Remove any absolute path indicators and normalize separators
    path.trim_start_matches('/')
        .trim_start_matches('\\')
        .replace('\\', "/")
}