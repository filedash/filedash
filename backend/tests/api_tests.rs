use reqwest::{Client, StatusCode};
use serde_json::{json, Value};
use tokio::fs;
use std::path::{Path, PathBuf};
use anyhow::Result;
use std::time::Duration;
use tokio::time::sleep;

mod test_helpers;
use test_helpers::start_test_server;

// Helper function to login and get token
async fn get_auth_token(client: &Client, base_url: &str) -> Result<String> {
    let response = client
        .post(&format!("{}/api/login", base_url))
        .json(&json!({
            "username": "admin",
            "password": "password"
        }))
        .send()
        .await?;
    
    let json_response: Value = response.json().await?;
    let token = json_response["token"].as_str()
        .ok_or_else(|| anyhow::anyhow!("Failed to extract token"))?
        .to_string();
    
    Ok(token)
}

// Setup helper for test files directory
async fn setup_test_files() -> Result<()> {
    let test_dir = Path::new("./test_files");
    if test_dir.exists() {
        fs::remove_dir_all(test_dir).await?;
    }
    fs::create_dir_all(test_dir).await?;
    
    // Create a test file for testing
    let test_content = "This is test file content";
    fs::write(test_dir.join("test.txt"), test_content).await?;
    
    Ok(())
}

// Wait for server to be ready helper
async fn wait_for_server(base_url: &str) -> Result<()> {
    let client = Client::builder()
        .timeout(Duration::from_secs(1))
        .build()?;
    
    for _ in 0..5 {
        match client.get(&format!("{}/api/login", base_url)).send().await {
            Ok(_) => return Ok(()),
            Err(_) => {
                sleep(Duration::from_millis(500)).await;
                continue;
            }
        }
    }
    
    Err(anyhow::anyhow!("Server didn't start in time"))
}

#[tokio::test]
async fn test_auth_login() -> Result<()> {
    // Start test server
    let (tx, base_url) = start_test_server().await;
    wait_for_server(&base_url).await?;
    
    let client = Client::new();
    
    // Test successful login
    let response = client
        .post(&format!("{}/api/login", base_url))
        .json(&json!({
            "username": "admin",
            "password": "password"
        }))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    let json: Value = response.json().await?;
    assert!(json.get("token").is_some());
    assert!(json.get("expires_in").is_some());
    
    // Test failed login
    let response = client
        .post(&format!("{}/api/login", base_url))
        .json(&json!({
            "username": "wrong",
            "password": "wrong"
        }))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    
    // Shutdown server
    let _ = tx.send(());
    Ok(())
}

#[tokio::test]
async fn test_token_validation() -> Result<()> {
    // Start test server
    let (tx, base_url) = start_test_server().await;
    wait_for_server(&base_url).await?;
    
    let client = Client::new();
    let token = get_auth_token(&client, &base_url).await?;
    
    // Test valid token
    let response = client
        .get(&format!("{}/api/validate", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    let json: Value = response.json().await?;
    assert_eq!(json["valid"], true);
    
    // Test invalid token
    let response = client
        .get(&format!("{}/api/validate", base_url))
        .header("Authorization", "Bearer invalid_token")
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    
    // Shutdown server
    let _ = tx.send(());
    Ok(())
}

#[tokio::test]
async fn test_file_listing() -> Result<()> {
    // Setup test environment
    setup_test_files().await?;
    
    // Start test server
    let (tx, base_url) = start_test_server().await;
    wait_for_server(&base_url).await?;
    
    let client = Client::new();
    let token = get_auth_token(&client, &base_url).await?;
    
    // Test listing root directory
    let response = client
        .get(&format!("{}/api/list?path=.", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    let files: Vec<Value> = response.json().await?;
    
    // Files should be an array (with one test file we created)
    assert!(!files.is_empty());
    let found_test_file = files.iter().any(|f| f["name"].as_str().unwrap_or("") == "test.txt");
    assert!(found_test_file, "Test file not found in directory listing");
    
    // Test unauthorized request
    let response = client
        .get(&format!("{}/api/list?path=.", base_url))
        .send() // No auth header
        .await?;
    
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    
    // Shutdown server
    let _ = tx.send(());
    Ok(())
}

#[tokio::test]
async fn test_file_upload_and_download() -> Result<()> {
    // Setup test environment
    setup_test_files().await?;
    
    // Start test server
    let (tx, base_url) = start_test_server().await;
    wait_for_server(&base_url).await?;
    
    let client = Client::new();
    let token = get_auth_token(&client, &base_url).await?;
    
    // Create a temporary test file content
    let test_content = "This is a new uploaded test file content";
    let test_filename = "upload_test.txt";
    
    // Create form part
    let part = reqwest::multipart::Part::text(test_content.to_string())
        .file_name(test_filename.to_string());
    
    // Create multipart form
    let form = reqwest::multipart::Form::new()
        .text("path", test_filename)
        .part("file", part);
    
    // Upload the test file
    let response = client
        .post(&format!("{}/api/upload", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .multipart(form)
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    let json_response: Value = response.json().await?;
    assert_eq!(json_response["success"], true);
    
    // Verify file shows up in file list
    let response = client
        .get(&format!("{}/api/list?path=.", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    let files: Vec<Value> = response.json().await?;
    let uploaded_file = files.iter().find(|f| f["name"] == test_filename);
    assert!(uploaded_file.is_some(), "Uploaded file not found in listing");
    
    // Test downloading the file
    let response = client
        .get(&format!("{}/api/download/{}", base_url, test_filename))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    let downloaded_content = response.text().await?;
    assert_eq!(downloaded_content, test_content);
    
    // Shutdown server
    let _ = tx.send(());
    Ok(())
}

#[tokio::test]
async fn test_file_operations() -> Result<()> {
    // Setup test environment
    setup_test_files().await?;
    
    // Start test server
    let (tx, base_url) = start_test_server().await;
    wait_for_server(&base_url).await?;
    
    let client = Client::new();
    let token = get_auth_token(&client, &base_url).await?;
    
    // Create a test file for operations
    let test_content = "Test file for operations";
    let test_filename = "operations_test.txt";
    let new_filename = "renamed_file.txt";
    
    // Create form part for file
    let part = reqwest::multipart::Part::text(test_content.to_string())
        .file_name(test_filename.to_string());
    
    // Create multipart form
    let form = reqwest::multipart::Form::new()
        .text("path", test_filename)
        .part("file", part);
    
    // Upload the test file
    client
        .post(&format!("{}/api/upload", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .multipart(form)
        .send()
        .await?;
    
    // 1. Test renaming the file
    let response = client
        .put(&format!("{}/api/rename/{}", base_url, test_filename))
        .header("Authorization", format!("Bearer {}", token))
        .json(&json!({
            "new_name": new_filename
        }))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    
    // Verify file was renamed in listing
    let response = client
        .get(&format!("{}/api/list?path=.", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    let files: Vec<Value> = response.json().await?;
    let renamed_file = files.iter().find(|f| f["name"] == new_filename);
    assert!(renamed_file.is_some(), "Renamed file not found in listing");
    
    // 2. Test creating a subfolder for move operation
    let form = reqwest::multipart::Form::new()
        .text("path", "subfolder/");
    
    client
        .post(&format!("{}/api/upload", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .multipart(form)
        .send()
        .await?;
    
    // 3. Test moving the file
    let move_path = "subfolder/moved_file.txt";
    let response = client
        .put(&format!("{}/api/move/{}", base_url, new_filename))
        .header("Authorization", format!("Bearer {}", token))
        .json(&json!({
            "destination": move_path
        }))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    
    // Verify file was moved to the subfolder
    let response = client
        .get(&format!("{}/api/list?path=subfolder", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    let files: Vec<Value> = response.json().await?;
    let moved_file = files.iter().find(|f| f["name"] == "moved_file.txt");
    assert!(moved_file.is_some(), "Moved file not found in subfolder");
    
    // 4. Test deleting the file
    let response = client
        .delete(&format!("{}/api/delete/{}", base_url, move_path))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    
    // Verify file was deleted
    let response = client
        .get(&format!("{}/api/list?path=subfolder", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    let files: Vec<Value> = response.json().await?;
    let deleted_file = files.iter().find(|f| f["name"] == "moved_file.txt");
    assert!(deleted_file.is_none(), "File was not deleted successfully");
    
    // Shutdown server
    let _ = tx.send(());
    Ok(())
}

#[tokio::test]
async fn test_search_api() -> Result<()> {
    // Setup test environment
    setup_test_files().await?;
    
    // Start test server
    let (tx, base_url) = start_test_server().await;
    wait_for_server(&base_url).await?;
    
    let client = Client::new();
    let token = get_auth_token(&client, &base_url).await?;
    
    // Create multiple test files with different content
    let files = [
        ("file1.txt", "This is file one with test content"),
        ("file2.txt", "Another file with different content"),
        ("test_data.txt", "Test data file with special keywords"),
        ("document.txt", "Regular document without special terms"),
    ];
    
    // Upload all test files
    for (filename, content) in &files {
        let part = reqwest::multipart::Part::text(content.to_string())
            .file_name(filename.to_string());
        
        let form = reqwest::multipart::Form::new()
            .text("path", filename.to_string())
            .part("file", part);
        
        client
            .post(&format!("{}/api/upload", base_url))
            .header("Authorization", format!("Bearer {}", token))
            .multipart(form)
            .send()
            .await?;
    }
    
    // Test search API
    let response = client
        .get(&format!("{}/api/search?query=test&path=.", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    
    assert_eq!(response.status(), StatusCode::OK);
    let search_results: Vec<Value> = response.json().await?;
    
    // Should find at least the files with "test" in the name
    assert!(!search_results.is_empty());
    
    // Specifically the test files and test_data.txt should be found
    let found_test_file = search_results.iter().any(|r| r["name"].as_str().unwrap_or("") == "test.txt");
    let found_test_data = search_results.iter().any(|r| r["name"].as_str().unwrap_or("") == "test_data.txt");
    
    assert!(found_test_file, "test.txt not found in search results");
    assert!(found_test_data, "test_data.txt not found in search results");
    
    // Shutdown server
    let _ = tx.send(());
    Ok(())
}