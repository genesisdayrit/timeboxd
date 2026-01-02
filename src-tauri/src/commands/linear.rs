use crate::models::{LinearProject, SaveLinearProjectRequest};
use crate::state::AppState;
use chrono::Local;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

const LINEAR_PROJECT_SELECT_COLUMNS: &str = "id, linear_project_id, linear_team_id, name, description, state, is_active_timebox_project, created_at, updated_at, archived_at, deleted_at";

// GraphQL Response types for Linear API
#[derive(Debug, Deserialize)]
struct LinearTeamsResponse {
    data: Option<LinearTeamsData>,
    errors: Option<Vec<LinearError>>,
}

#[derive(Debug, Deserialize)]
struct LinearTeamsData {
    teams: LinearTeamsNodes,
}

#[derive(Debug, Deserialize)]
struct LinearTeamsNodes {
    nodes: Vec<LinearTeam>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinearTeam {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
struct LinearProjectsResponse {
    data: Option<LinearProjectsData>,
    errors: Option<Vec<LinearError>>,
}

#[derive(Debug, Deserialize)]
struct LinearProjectsData {
    team: LinearTeamWithProjects,
}

#[derive(Debug, Deserialize)]
struct LinearTeamWithProjects {
    projects: LinearProjectsNodes,
}

#[derive(Debug, Deserialize)]
struct LinearProjectsNodes {
    nodes: Vec<LinearApiProject>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinearApiProject {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub state: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LinearError {
    message: String,
}

// Command: Fetch teams from Linear
#[tauri::command]
pub fn get_linear_teams(api_key: String) -> Result<Vec<LinearTeam>, String> {
    let client = reqwest::blocking::Client::new();
    // Fetch up to 100 teams (Linear max is 250)
    let query = r#"{ "query": "{ teams(first: 100) { nodes { id name } } }" }"#;

    let response = client
        .post("https://api.linear.app/graphql")
        .header("Authorization", &api_key)
        .header("Content-Type", "application/json")
        .body(query)
        .send()
        .map_err(|e| format!("Failed to connect to Linear: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Linear API returned status: {}", response.status()));
    }

    let result: LinearTeamsResponse = response
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(errors) = result.errors {
        return Err(errors
            .into_iter()
            .map(|e| e.message)
            .collect::<Vec<_>>()
            .join(", "));
    }

    Ok(result.data.map(|d| d.teams.nodes).unwrap_or_default())
}

// Command: Fetch projects for a team from Linear
#[tauri::command]
pub fn get_linear_team_projects(api_key: String, team_id: String) -> Result<Vec<LinearApiProject>, String> {
    let client = reqwest::blocking::Client::new();
    // Fetch up to 250 projects (Linear's max per request)
    let query = format!(
        r#"{{ "query": "{{ team(id: \"{}\") {{ projects(first: 250) {{ nodes {{ id name description state }} }} }} }}" }}"#,
        team_id
    );

    let response = client
        .post("https://api.linear.app/graphql")
        .header("Authorization", &api_key)
        .header("Content-Type", "application/json")
        .body(query)
        .send()
        .map_err(|e| format!("Failed to connect to Linear: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Linear API returned status: {}", response.status()));
    }

    let result: LinearProjectsResponse = response
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(errors) = result.errors {
        return Err(errors
            .into_iter()
            .map(|e| e.message)
            .collect::<Vec<_>>()
            .join(", "));
    }

    Ok(result.data.map(|d| d.team.projects.nodes).unwrap_or_default())
}

// Command: Save a Linear project to local DB (upsert)
#[tauri::command]
pub fn save_linear_project(
    state: State<'_, AppState>,
    request: SaveLinearProjectRequest,
) -> Result<LinearProject, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Upsert: insert or update if exists
    conn.execute(
        r#"INSERT INTO linear_projects (linear_project_id, linear_team_id, name, description, state, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
           ON CONFLICT(linear_project_id) DO UPDATE SET
             linear_team_id = excluded.linear_team_id,
             name = excluded.name,
             description = excluded.description,
             state = excluded.state,
             updated_at = excluded.updated_at"#,
        params![
            request.linear_project_id,
            request.linear_team_id,
            request.name,
            request.description,
            request.state,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM linear_projects WHERE linear_project_id = ?1",
            LINEAR_PROJECT_SELECT_COLUMNS
        ))
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![request.linear_project_id], LinearProject::from_row)
        .map_err(|e| e.to_string())
}

// Command: Toggle is_active_timebox_project
#[tauri::command]
pub fn toggle_linear_project_active(
    state: State<'_, AppState>,
    linear_project_id: String,
    is_active: bool,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE linear_projects SET is_active_timebox_project = ?1, updated_at = ?2 WHERE linear_project_id = ?3",
        params![if is_active { 1 } else { 0 }, now, linear_project_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// Command: Get all saved Linear projects (excluding deleted)
#[tauri::command]
pub fn get_linear_projects(state: State<'_, AppState>) -> Result<Vec<LinearProject>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM linear_projects WHERE deleted_at IS NULL ORDER BY name",
            LINEAR_PROJECT_SELECT_COLUMNS
        ))
        .map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map([], LinearProject::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(projects)
}

// Command: Get projects where is_active_timebox_project = true
#[tauri::command]
pub fn get_active_timebox_projects(state: State<'_, AppState>) -> Result<Vec<LinearProject>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM linear_projects WHERE is_active_timebox_project = 1 AND deleted_at IS NULL ORDER BY name",
            LINEAR_PROJECT_SELECT_COLUMNS
        ))
        .map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map([], LinearProject::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(projects)
}

// Command: Archive a Linear project
#[tauri::command]
pub fn archive_linear_project(
    state: State<'_, AppState>,
    linear_project_id: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE linear_projects SET archived_at = ?1, updated_at = ?1 WHERE linear_project_id = ?2",
        params![now, linear_project_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// Command: Soft delete a Linear project
#[tauri::command]
pub fn delete_linear_project(
    state: State<'_, AppState>,
    linear_project_id: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE linear_projects SET deleted_at = ?1, updated_at = ?1 WHERE linear_project_id = ?2",
        params![now, linear_project_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
