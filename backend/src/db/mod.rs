use sqlx::{Pool, Sqlite, SqlitePool};
use std::time::Duration;

pub mod migrations;
pub mod models;

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        // Parse the database URL to extract the file path
        let file_path = if database_url.starts_with("sqlite:") {
            database_url.strip_prefix("sqlite:").unwrap_or(database_url)
        } else {
            database_url
        };
        
        let pool = SqlitePool::connect_with(
            sqlx::sqlite::SqliteConnectOptions::new()
                .filename(file_path)
                .create_if_missing(true)
                .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
                .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
                .busy_timeout(Duration::from_secs(30)),
        )
        .await?;

        // Run migrations
        migrations::run_migrations(&pool).await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}

// Database trait for dependency injection and testing
#[async_trait::async_trait]
pub trait DatabaseRepository: Send + Sync {
    async fn get_pool(&self) -> &Pool<Sqlite>;
}

#[async_trait::async_trait]
impl DatabaseRepository for Database {
    async fn get_pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }
}
