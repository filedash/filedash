use crate::errors::ApiError;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};
use tokio::fs;

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub score: f32,
}

pub struct SearchService {
    root_dir: PathBuf,
}

impl SearchService {
    pub fn new(root_dir: PathBuf) -> Self {
        Self { root_dir }
    }
    
    /// Perform a fuzzy search for files and directories
    pub async fn search(&self, query: &str, path: Option<&Path>) -> Result<Vec<SearchResult>, ApiError> {
        let search_path = match path {
            Some(p) => self.root_dir.join(p),
            None => self.root_dir.clone(),
        };
        
        if !search_path.exists() {
            return Err(ApiError::NotFound("Search path not found".to_string()));
        }
        
        if !search_path.is_dir() {
            return Err(ApiError::InvalidInput("Search path is not a directory".to_string()));
        }
        
        // Check if path is within root directory to prevent traversal
        if !search_path.starts_with(&self.root_dir) {
            return Err(ApiError::PathTraversal("Path traversal attempt detected".to_string()));
        }
        
        let query_lowercase = query.to_lowercase();
        let mut results = Vec::new();
        
        // Walk the directory tree
        for entry in WalkDir::new(&search_path)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            let metadata = match fs::metadata(path).await {
                Ok(m) => m,
                Err(_) => continue, // Skip if we can't read metadata
            };
            
            let filename = match path.file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => continue, // Skip if we can't get the filename
            };
            
            let filename_lowercase = filename.to_lowercase();
            
            // Simple fuzzy matching algorithm (for a real implementation, use a proper fuzzy matching library)
            if filename_lowercase.contains(&query_lowercase) {
                // Calculate a simple score based on how closely the name matches the query
                let score = self.calculate_score(&filename_lowercase, &query_lowercase);
                
                // Create a relative path from the root directory
                let relative_path = match path.strip_prefix(&self.root_dir) {
                    Ok(p) => p.to_string_lossy().to_string(),
                    Err(_) => continue, // Skip if we can't get the relative path
                };
                
                results.push(SearchResult {
                    path: relative_path,
                    name: filename,
                    is_dir: metadata.is_dir(),
                    score,
                });
            }
        }
        
        // Sort results by score (highest first)
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        // Limit results to avoid overwhelming response
        let max_results = 100;
        if results.len() > max_results {
            results.truncate(max_results);
        }
        
        Ok(results)
    }
    
    /// Calculate a simple score for fuzzy matching
    fn calculate_score(&self, filename: &str, query: &str) -> f32 {
        // Direct match gets highest score
        if filename == query {
            return 1.0;
        }
        
        // Starts with query gets high score
        if filename.starts_with(query) {
            return 0.9;
        }
        
        // Calculate how much of the query matches the filename
        let query_len = query.len() as f32;
        let filename_len = filename.len() as f32;
        
        // Simple score based on the relative length of the query to the filename
        let length_ratio = query_len / filename_len;
        
        // Adjust score based on position of the match
        let position = filename.find(query).unwrap_or(filename.len());
        let position_factor = 1.0 - (position as f32 / filename_len);
        
        // Combine factors for final score (between 0 and 0.8)
        0.5 * length_ratio + 0.3 * position_factor
    }
}