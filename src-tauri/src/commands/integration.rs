use crate::models::{CreateIntegrationRequest, Integration};
use crate::state::AppState;
use chrono::Local;
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use tauri::State;

const INTEGRATION_SELECT_COLUMNS: &str = "id, connection_name, integration_type, connection_config, created_at, updated_at";

// Linear types
#[derive(Debug, Deserialize)]
struct LinearViewerResponse {
    data: Option<LinearViewerData>,
    errors: Option<Vec<LinearError>>,
}

#[derive(Debug, Deserialize)]
struct LinearViewerData {
    viewer: LinearViewer,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct LinearViewer {
    id: String,
    name: String,
    email: String,
}

#[derive(Debug, Deserialize)]
struct LinearError {
    message: String,
}

#[derive(Debug, serde::Serialize)]
pub struct LinearTestResult {
    pub success: bool,
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub error: Option<String>,
}

// Todoist types
#[derive(Debug, serde::Serialize)]
pub struct TodoistTestResult {
    pub success: bool,
    pub user_name: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TodoistUser {
    full_name: String,
}

#[tauri::command]
pub fn test_linear_connection(api_key: String) -> Result<LinearTestResult, String> {
    let client = reqwest::blocking::Client::new();

    let query = r#"{ "query": "{ viewer { id name email } }" }"#;

    let response = client
        .post("https://api.linear.app/graphql")
        .header("Authorization", &api_key)
        .header("Content-Type", "application/json")
        .body(query)
        .send()
        .map_err(|e| format!("Failed to connect to Linear: {}", e))?;

    if !response.status().is_success() {
        return Ok(LinearTestResult {
            success: false,
            user_name: None,
            user_email: None,
            error: Some(format!("Linear API returned status: {}", response.status())),
        });
    }

    let result: LinearViewerResponse = response
        .json()
        .map_err(|e| format!("Failed to parse Linear response: {}", e))?;

    if let Some(errors) = result.errors {
        let error_msg = errors
            .into_iter()
            .map(|e| e.message)
            .collect::<Vec<_>>()
            .join(", ");
        return Ok(LinearTestResult {
            success: false,
            user_name: None,
            user_email: None,
            error: Some(error_msg),
        });
    }

    if let Some(data) = result.data {
        Ok(LinearTestResult {
            success: true,
            user_name: Some(data.viewer.name),
            user_email: Some(data.viewer.email),
            error: None,
        })
    } else {
        Ok(LinearTestResult {
            success: false,
            user_name: None,
            user_email: None,
            error: Some("No data returned from Linear".to_string()),
        })
    }
}

#[tauri::command]
pub fn test_todoist_connection(api_token: String) -> Result<TodoistTestResult, String> {
    let client = reqwest::blocking::Client::new();

    let response = client
        .get("https://api.todoist.com/sync/v9/user")
        .header("Authorization", format!("Bearer {}", api_token))
        .send()
        .map_err(|e| format!("Failed to connect to Todoist: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        return Ok(TodoistTestResult {
            success: false,
            user_name: None,
            error: Some(format!("Todoist API returned status: {}", status)),
        });
    }

    let user: TodoistUser = response
        .json()
        .map_err(|e| format!("Failed to parse Todoist response: {}", e))?;

    Ok(TodoistTestResult {
        success: true,
        user_name: Some(user.full_name),
        error: None,
    })
}

#[tauri::command]
pub fn create_integration(
    state: State<'_, AppState>,
    request: CreateIntegrationRequest,
) -> Result<Integration, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let config_json = serde_json::to_string(&request.connection_config)
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO integrations (connection_name, integration_type, connection_config, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![request.connection_name, request.integration_type, config_json, now, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM integrations WHERE id = ?1", INTEGRATION_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let integration = stmt
        .query_row(params![id], Integration::from_row)
        .map_err(|e| e.to_string())?;

    Ok(integration)
}

#[tauri::command]
pub fn get_integrations(state: State<'_, AppState>) -> Result<Vec<Integration>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM integrations ORDER BY created_at DESC",
            INTEGRATION_SELECT_COLUMNS
        ))
        .map_err(|e| e.to_string())?;

    let integrations: Vec<Integration> = stmt
        .query_map([], Integration::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(integrations)
}

#[tauri::command]
pub fn get_integration_by_type(
    state: State<'_, AppState>,
    integration_type: String,
) -> Result<Option<Integration>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM integrations WHERE integration_type = ?1 LIMIT 1",
            INTEGRATION_SELECT_COLUMNS
        ))
        .map_err(|e| e.to_string())?;

    let integration = stmt
        .query_row(params![integration_type], Integration::from_row)
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(integration)
}

#[tauri::command]
pub fn delete_integration(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM integrations WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
