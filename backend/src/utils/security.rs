use crate::errors::ApiError;
use std::path::{Path, PathBuf};

/// Validates and normalizes a file path to prevent directory traversal attacks
pub fn validate_path(path: &str) -> Result<PathBuf, ApiError> {
    // Normalize the path
    let normalized = path_clean::clean(path);
    
    // Convert to string for validation
    let path_str = normalized.to_string_lossy();
    
    // Check for directory traversal attempts
    if path_str.contains("..") {
        return Err(ApiError::InvalidPath {
            path: path.to_string(),
        });
    }
    
    // Check for null bytes
    if path_str.contains('\0') {
        return Err(ApiError::InvalidPath {
            path: path.to_string(),
        });
    }
    
    // Check path length (reasonable limit)
    if path_str.len() > 1000 {
        return Err(ApiError::InvalidPath {
            path: path.to_string(),
        });
    }
    
    // Ensure path doesn't start with / to make it relative
    let clean_path = if path_str.starts_with('/') {
        &path_str[1..]
    } else {
        &path_str
    };
    
    Ok(PathBuf::from(clean_path))
}

/// Resolves a user path relative to the storage root directory
pub fn resolve_path(storage_root: &Path, user_path: &str) -> Result<PathBuf, ApiError> {
    let validated_path = validate_path(user_path)?;
    let full_path = storage_root.join(validated_path);
    
    // Ensure the resolved path is still within the storage root
    if !full_path.starts_with(storage_root) {
        return Err(ApiError::InvalidPath {
            path: user_path.to_string(),
        });
    }
    
    Ok(full_path)
}

/// Validates file extension against allowed list
pub fn validate_file_extension(filename: &str, allowed_extensions: &[String]) -> Result<(), ApiError> {
    // Allow all files if wildcard is present
    if allowed_extensions.contains(&"*".to_string()) {
        return Ok(());
    }
    
    let extension = Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");
    
    if allowed_extensions.iter().any(|ext| ext == extension) {
        Ok(())
    } else {
        Err(ApiError::InvalidFileType {
            file_type: extension.to_string(),
        })
    }
}

/// Validates file size against maximum allowed size
pub fn validate_file_size(size: u64, max_size: u64) -> Result<(), ApiError> {
    if size > max_size {
        Err(ApiError::FileTooLarge { size })
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_validate_path_normal() {
        let result = validate_path("documents/test.txt");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), PathBuf::from("documents/test.txt"));
    }

    #[test]
    fn test_validate_path_traversal() {
        let result = validate_path("../../../etc/passwd");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_path_null_byte() {
        let result = validate_path("test\0.txt");
        assert!(result.is_err());
    }

    #[test]
    fn test_resolve_path() {
        let storage_root = PathBuf::from("/app/files");
        let result = resolve_path(&storage_root, "documents/test.txt");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), PathBuf::from("/app/files/documents/test.txt"));
    }

    #[test]
    fn test_validate_file_extension_allowed() {
        let allowed = vec!["txt".to_string(), "pdf".to_string()];
        let result = validate_file_extension("test.txt", &allowed);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_file_extension_wildcard() {
        let allowed = vec!["*".to_string()];
        let result = validate_file_extension("test.exe", &allowed);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_file_size_ok() {
        let result = validate_file_size(1000, 2000);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_file_size_too_large() {
        let result = validate_file_size(3000, 2000);
        assert!(result.is_err());
    }
}
