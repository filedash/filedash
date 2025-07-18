use sqlx::SqlitePool;

pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Create users table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create sessions table for token blacklisting
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for better performance
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")
        .execute(pool)
        .await?;

    // Create default admin user if none exists
    create_default_admin_user(pool).await?;

    tracing::info!("Database migrations completed successfully");
    Ok(())
}

async fn create_default_admin_user(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await?;

    if user_count == 0 {
        use argon2::{Argon2, PasswordHasher};
        use argon2::password_hash::{rand_core::OsRng, SaltString};
        use uuid::Uuid;

        let password = std::env::var("FILEDASH_ADMIN_PASSWORD")
            .unwrap_or_else(|_| "admin123".to_string());
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| sqlx::Error::Protocol(format!("Password hashing failed: {}", e)))?
            .to_string();

        let admin_id = Uuid::new_v4().to_string();
        
        sqlx::query(
            r#"
            INSERT INTO users (id, email, password_hash, role, is_active)
            VALUES (?, ?, ?, 'admin', true)
            "#,
        )
        .bind(&admin_id)
        .bind("admin@filedash.local")
        .bind(&password_hash)
        .execute(pool)
        .await?;

        tracing::info!("Default admin user created: admin@filedash.local / admin123");
        tracing::warn!("Please change the default admin password in production!");
    }

    Ok(())
}
