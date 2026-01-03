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

// ============================================
// Linear Issue API Commands
// ============================================

// GraphQL Response types for Linear Issue API
#[derive(Debug, Deserialize)]
struct IssueCreateResponse {
    data: Option<IssueCreateData>,
    errors: Option<Vec<LinearError>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IssueCreateData {
    issue_create: IssueCreateResult,
}

#[derive(Debug, Deserialize)]
struct IssueCreateResult {
    success: bool,
    issue: Option<LinearIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinearIssue {
    pub id: String,
    pub identifier: String,
    pub url: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLinearIssueRequest {
    pub title: String,
    pub description: Option<String>,
    pub project_id: String,
    pub team_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLinearIssueResult {
    pub success: bool,
    pub issue: Option<LinearIssue>,
    pub error: Option<String>,
}

// Command: Create a Linear issue
#[tauri::command]
pub fn create_linear_issue(
    api_key: String,
    request: CreateLinearIssueRequest,
) -> Result<CreateLinearIssueResult, String> {
    let client = reqwest::blocking::Client::new();

    // Escape special characters for GraphQL
    let title_escaped = request.title.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', "\\n");
    let description_escaped = request
        .description
        .clone()
        .unwrap_or_default()
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n");

    let query = format!(
        r#"{{ "query": "mutation {{ issueCreate(input: {{ title: \"{}\", description: \"{}\", projectId: \"{}\", teamId: \"{}\" }}) {{ success issue {{ id identifier url title }} }} }}" }}"#,
        title_escaped,
        description_escaped,
        request.project_id,
        request.team_id
    );

    let response = client
        .post("https://api.linear.app/graphql")
        .header("Authorization", &api_key)
        .header("Content-Type", "application/json")
        .body(query)
        .send()
        .map_err(|e| format!("Failed to connect to Linear: {}", e))?;

    if !response.status().is_success() {
        return Ok(CreateLinearIssueResult {
            success: false,
            issue: None,
            error: Some(format!("Linear API returned status: {}", response.status())),
        });
    }

    let result: IssueCreateResponse = response
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(errors) = result.errors {
        let error_msg = errors
            .into_iter()
            .map(|e| e.message)
            .collect::<Vec<_>>()
            .join(", ");
        return Ok(CreateLinearIssueResult {
            success: false,
            issue: None,
            error: Some(error_msg),
        });
    }

    match result.data {
        Some(data) => Ok(CreateLinearIssueResult {
            success: data.issue_create.success,
            issue: data.issue_create.issue,
            error: None,
        }),
        None => Ok(CreateLinearIssueResult {
            success: false,
            issue: None,
            error: Some("No data returned from Linear".to_string()),
        }),
    }
}

// GraphQL Response types for workflow states
#[derive(Debug, Deserialize)]
struct TeamStatesResponse {
    data: Option<TeamStatesData>,
    errors: Option<Vec<LinearError>>,
}

#[derive(Debug, Deserialize)]
struct TeamStatesData {
    team: TeamWithStates,
}

#[derive(Debug, Deserialize)]
struct TeamWithStates {
    states: StatesNodes,
}

#[derive(Debug, Deserialize)]
struct StatesNodes {
    nodes: Vec<LinearWorkflowState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinearWorkflowState {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub state_type: String,
}

// Command: Get workflow states for a team
#[tauri::command]
pub fn get_linear_team_states(api_key: String, team_id: String) -> Result<Vec<LinearWorkflowState>, String> {
    let client = reqwest::blocking::Client::new();

    let query = format!(
        r#"{{ "query": "{{ team(id: \"{}\") {{ states {{ nodes {{ id name type }} }} }} }}" }}"#,
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

    let result: TeamStatesResponse = response
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(errors) = result.errors {
        return Err(errors
            .into_iter()
            .map(|e| e.message)
            .collect::<Vec<_>>()
            .join(", "));
    }

    Ok(result.data.map(|d| d.team.states.nodes).unwrap_or_default())
}

// GraphQL Response types for issue update
#[derive(Debug, Deserialize)]
struct IssueUpdateResponse {
    data: Option<IssueUpdateData>,
    errors: Option<Vec<LinearError>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IssueUpdateData {
    issue_update: IssueUpdateResult,
}

#[derive(Debug, Deserialize)]
struct IssueUpdateResult {
    success: bool,
}

// Command: Update a Linear issue's state
#[tauri::command]
pub fn update_linear_issue_state(
    api_key: String,
    issue_id: String,
    state_id: String,
) -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();

    let query = format!(
        r#"{{ "query": "mutation {{ issueUpdate(id: \"{}\", input: {{ stateId: \"{}\" }}) {{ success }} }}" }}"#,
        issue_id,
        state_id
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

    let result: IssueUpdateResponse = response
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(errors) = result.errors {
        return Err(errors
            .into_iter()
            .map(|e| e.message)
            .collect::<Vec<_>>()
            .join(", "));
    }

    Ok(result.data.map(|d| d.issue_update.success).unwrap_or(false))
}
