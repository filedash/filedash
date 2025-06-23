pub mod files;
pub mod auth;

pub use files::routes as files_routes;
pub use auth::{routes as auth_routes, protected_routes as auth_protected_routes};
