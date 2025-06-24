use crate::{
    db::{models::*, Database},
    errors::ApiError,
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // User ID
    pub email: String,
    pub role: String,
    pub exp: i64, // Expiration time
    pub iat: i64, // Issued at
    pub jti: String, // JWT ID for token blacklisting
}

pub struct AuthService {
    db: Database,
    jwt_secret: String,
    token_expiration_hours: i64,
}

impl AuthService {
    pub fn new(db: Database, jwt_secret: String, token_expiration_hours: Option<i64>) -> Self {
        Self {
            db,
            jwt_secret,
            token_expiration_hours: token_expiration_hours.unwrap_or(24),
        }
    }

    /// Create a new user
    pub async fn create_user(&self, request: CreateUserRequest) -> Result<UserInfo, ApiError> {
        // Validate email format
        if !self.is_valid_email(&request.email) {
            return Err(ApiError::BadRequest {
                message: "Invalid email format".to_string(),
            });
        }

        // Validate password strength
        if !self.is_valid_password(&request.password) {
            return Err(ApiError::BadRequest {
                message: "Password must be at least 8 characters long".to_string(),
            });
        }

        // Check if user already exists
        let existing_user = sqlx::query("SELECT id FROM users WHERE email = ?")
            .bind(&request.email)
            .fetch_optional(self.db.pool())
            .await?;

        if existing_user.is_some() {
            return Err(ApiError::Conflict {
                message: "User with this email already exists".to_string(),
            });
        }

        // Hash password
        let password_hash = self.hash_password(&request.password)?;

        // Create user
        let user_id = Uuid::new_v4();
        let role = request.role.unwrap_or(UserRole::User);
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, true, ?, ?)
            "#,
        )
        .bind(user_id.to_string())
        .bind(&request.email)
        .bind(&password_hash)
        .bind(role.to_string())
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(self.db.pool())
        .await?;

        Ok(UserInfo {
            id: user_id,
            email: request.email,
            role,
            is_active: true,
            created_at: now,
        })
    }

    /// Authenticate user and return JWT token
    pub async fn login(&self, request: LoginRequest) -> Result<LoginResponse, ApiError> {
        // Get user from database
        let user_row = sqlx::query(
            "SELECT id, email, password_hash, role, is_active, created_at, updated_at FROM users WHERE email = ?"
        )
        .bind(&request.email)
        .fetch_optional(self.db.pool())
        .await?;

        let user_row = user_row.ok_or_else(|| ApiError::Unauthorized {
            message: "Invalid credentials".to_string(),
        })?;

        // Parse user data
        let user = User {
            id: Uuid::parse_str(&user_row.get::<String, _>("id"))
                .map_err(|_| ApiError::InternalServerError {
                    message: "Invalid user ID format".to_string(),
                })?,
            email: user_row.get("email"),
            password_hash: user_row.get("password_hash"),
            role: user_row.get::<String, _>("role").parse().map_err(|_| {
                ApiError::InternalServerError {
                    message: "Invalid user role".to_string(),
                }
            })?,
            is_active: user_row.get("is_active"),
            created_at: {
                let date_str: String = user_row.get("created_at");
                // Try to parse as SQLite datetime format first
                if let Ok(naive_dt) = chrono::NaiveDateTime::parse_from_str(&date_str, "%Y-%m-%d %H:%M:%S") {
                    DateTime::<Utc>::from_utc(naive_dt, Utc)
                } else {
                    // Fallback to RFC3339 parsing
                    chrono::DateTime::parse_from_rfc3339(&date_str)
                        .map_err(|_| ApiError::InternalServerError {
                            message: "Invalid date format".to_string(),
                        })?
                        .with_timezone(&Utc)
                }
            },
            updated_at: {
                let date_str: String = user_row.get("updated_at");
                // Try to parse as SQLite datetime format first
                if let Ok(naive_dt) = chrono::NaiveDateTime::parse_from_str(&date_str, "%Y-%m-%d %H:%M:%S") {
                    DateTime::<Utc>::from_utc(naive_dt, Utc)
                } else {
                    // Fallback to RFC3339 parsing
                    chrono::DateTime::parse_from_rfc3339(&date_str)
                        .map_err(|_| ApiError::InternalServerError {
                            message: "Invalid date format".to_string(),
                        })?
                        .with_timezone(&Utc)
                }
            },
        };

        // Check if user is active
        if !user.is_active {
            return Err(ApiError::Unauthorized {
                message: "Account is disabled".to_string(),
            });
        }

        // Verify password
        if !self.verify_password(&request.password, &user.password_hash)? {
            return Err(ApiError::Unauthorized {
                message: "Invalid credentials".to_string(),
            });
        }

        // Generate JWT token
        let token_id = Uuid::new_v4();
        let now = Utc::now();
        let expires_at = now + Duration::hours(self.token_expiration_hours);

        let claims = Claims {
            sub: user.id.to_string(),
            email: user.email.clone(),
            role: user.role.to_string(),
            exp: expires_at.timestamp(),
            iat: now.timestamp(),
            jti: token_id.to_string(),
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_ref()),
        )
        .map_err(|e| ApiError::InternalServerError {
            message: format!("Failed to generate token: {}", e),
        })?;

        // Store session for token blacklisting
        let token_hash = self.hash_token(&token);
        sqlx::query(
            r#"
            INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(token_id.to_string())
        .bind(user.id.to_string())
        .bind(&token_hash)
        .bind(expires_at.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(self.db.pool())
        .await?;

        Ok(LoginResponse {
            token,
            user: user.into(),
            expires_at,
        })
    }

    /// Logout user by blacklisting token
    pub async fn logout(&self, token: &str) -> Result<(), ApiError> {
        let token_hash = self.hash_token(token);
        let now = Utc::now();
        
        // Mark session as expired (soft delete)
        sqlx::query("UPDATE sessions SET expires_at = ? WHERE token_hash = ?")
            .bind(now.to_rfc3339())
            .bind(&token_hash)
            .execute(self.db.pool())
            .await?;

        Ok(())
    }

    /// Logout all sessions for a user
    pub async fn logout_user(&self, user_id: Uuid) -> Result<(), ApiError> {
        let now = Utc::now();
        // Mark all sessions for this user as expired
        sqlx::query("UPDATE sessions SET expires_at = ? WHERE user_id = ?")
            .bind(now.to_rfc3339())
            .bind(user_id)
            .execute(self.db.pool())
            .await?;

        Ok(())
    }

    /// Validate JWT token and return claims
    pub async fn validate_token(&self, token: &str) -> Result<Claims, ApiError> {
        // Decode token
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_ref()),
            &Validation::default(),
        )
        .map_err(|e| ApiError::Unauthorized {
            message: format!("Invalid token: {}", e),
        })?;

        let claims = token_data.claims;

        // Check if token is blacklisted
        let token_hash = self.hash_token(token);
        let session = sqlx::query("SELECT expires_at FROM sessions WHERE token_hash = ?")
            .bind(&token_hash)
            .fetch_optional(self.db.pool())
            .await?;

        if let Some(session) = session {
            let expires_at_str: String = session.get("expires_at");
            let expires_at = if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&expires_at_str) {
                dt.with_timezone(&Utc)
            } else if let Ok(naive_dt) = chrono::NaiveDateTime::parse_from_str(&expires_at_str, "%Y-%m-%d %H:%M:%S") {
                DateTime::<Utc>::from_utc(naive_dt, Utc)
            } else {
                return Err(ApiError::InternalServerError {
                    message: "Invalid session expiration format".to_string()
                });
            };

            if expires_at <= Utc::now() {
                return Err(ApiError::Unauthorized {
                    message: "Token has been revoked".to_string(),
                });
            }
        }

        // Check token expiration
        if claims.exp < Utc::now().timestamp() {
            return Err(ApiError::Unauthorized {
                message: "Token has expired".to_string(),
            });
        }

        Ok(claims)
    }

    /// Get user by ID
    pub async fn get_user_by_id(&self, user_id: &Uuid) -> Result<UserInfo, ApiError> {
        let user_row = sqlx::query(
            "SELECT id, email, role, is_active, created_at FROM users WHERE id = ?"
        )
        .bind(user_id.to_string())
        .fetch_optional(self.db.pool())
        .await?;

        let user_row = user_row.ok_or_else(|| ApiError::NotFound {
            resource: "User".to_string(),
            id: user_id.to_string(),
        })?;

        Ok(UserInfo {
            id: *user_id,
            email: user_row.get("email"),
            role: user_row.get::<String, _>("role").parse().map_err(|_| {
                ApiError::InternalServerError {
                    message: "Invalid user role".to_string(),
                }
            })?,
            is_active: user_row.get("is_active"),
            created_at: {
                let date_str: String = user_row.get("created_at");
                // Try to parse as SQLite datetime format first
                if let Ok(naive_dt) = chrono::NaiveDateTime::parse_from_str(&date_str, "%Y-%m-%d %H:%M:%S") {
                    DateTime::<Utc>::from_utc(naive_dt, Utc)
                } else {
                    // Fallback to RFC3339 parsing
                    chrono::DateTime::parse_from_rfc3339(&date_str)
                        .map_err(|_| ApiError::InternalServerError {
                            message: "Invalid date format".to_string(),
                        })?
                        .with_timezone(&Utc)
                }
            },
        })
    }

    /// Clean up expired sessions
    pub async fn cleanup_expired_sessions(&self) -> Result<u64, ApiError> {
        let result = sqlx::query("DELETE FROM sessions WHERE expires_at <= datetime('now')")
            .execute(self.db.pool())
            .await?;

        Ok(result.rows_affected())
    }

    // Private helper methods
    fn hash_password(&self, password: &str) -> Result<String, ApiError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        argon2
            .hash_password(password.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|e| ApiError::InternalServerError {
                message: format!("Password hashing failed: {}", e),
            })
    }

    fn verify_password(&self, password: &str, hash: &str) -> Result<bool, ApiError> {
        let parsed_hash = PasswordHash::new(hash).map_err(|e| ApiError::InternalServerError {
            message: format!("Invalid password hash: {}", e),
        })?;

        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    fn hash_token(&self, token: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        token.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    fn is_valid_email(&self, email: &str) -> bool {
        let email_regex = regex::Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .expect("Invalid email regex");
        email_regex.is_match(email)
    }

    fn is_valid_password(&self, password: &str) -> bool {
        password.len() >= 8
    }
}
