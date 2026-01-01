use crate::models::{CreateTimeboxRequest, Session, Timebox};
use crate::state::AppState;
use chrono::Local;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn create_timebox(
    state: State<'_, AppState>,
    request: CreateTimeboxRequest,
) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO timeboxes (description, intended_duration) VALUES (?1, ?2)",
        params![request.description, request.intended_duration],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let mut stmt = conn
        .prepare("SELECT id, description, intended_duration, status, created_at, updated_at FROM timeboxes WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn start_timebox(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Update timebox status to active
    conn.execute(
        "UPDATE timeboxes SET status = 'active', updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Create a new session
    conn.execute(
        "INSERT INTO sessions (timebox_id, start_time) VALUES (?1, ?2)",
        params![id, now],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare("SELECT id, description, intended_duration, status, created_at, updated_at FROM timeboxes WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn stop_timebox(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Close any open sessions for this timebox
    conn.execute(
        "UPDATE sessions SET end_time = ?1, end_reason = 'manual_stop' WHERE timebox_id = ?2 AND end_time IS NULL",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update timebox status to completed
    conn.execute(
        "UPDATE timeboxes SET status = 'completed', updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare("SELECT id, description, intended_duration, status, created_at, updated_at FROM timeboxes WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn cancel_timebox(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Close any open sessions for this timebox
    conn.execute(
        "UPDATE sessions SET end_time = ?1, end_reason = 'cancelled' WHERE timebox_id = ?2 AND end_time IS NULL",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update timebox status to cancelled
    conn.execute(
        "UPDATE timeboxes SET status = 'cancelled', updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare("SELECT id, description, intended_duration, status, created_at, updated_at FROM timeboxes WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn delete_timebox(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM timeboxes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(serde::Serialize)]
pub struct TimeboxWithSessions {
    #[serde(flatten)]
    pub timebox: Timebox,
    pub sessions: Vec<Session>,
    pub actual_duration: f64,
}

#[tauri::command]
pub fn get_today_timeboxes(state: State<'_, AppState>) -> Result<Vec<TimeboxWithSessions>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut timebox_stmt = conn
        .prepare(
            "SELECT id, description, intended_duration, status, created_at, updated_at
             FROM timeboxes
             WHERE date(created_at) = date('now', 'localtime')
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let timeboxes: Vec<Timebox> = timebox_stmt
        .query_map([], Timebox::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut result = Vec::new();

    for timebox in timeboxes {
        let mut session_stmt = conn
            .prepare(
                "SELECT id, timebox_id, start_time, end_time, end_reason, created_at
                 FROM sessions
                 WHERE timebox_id = ?1
                 ORDER BY start_time DESC",
            )
            .map_err(|e| e.to_string())?;

        let sessions: Vec<Session> = session_stmt
            .query_map(params![timebox.id], Session::from_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        // Calculate actual duration in minutes
        let actual_duration: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM((julianday(COALESCE(end_time, datetime('now', 'localtime'))) - julianday(start_time)) * 1440), 0)
                 FROM sessions WHERE timebox_id = ?1",
                params![timebox.id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        result.push(TimeboxWithSessions {
            timebox,
            sessions,
            actual_duration,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn get_active_timeboxes(state: State<'_, AppState>) -> Result<Vec<TimeboxWithSessions>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut timebox_stmt = conn
        .prepare(
            "SELECT id, description, intended_duration, status, created_at, updated_at
             FROM timeboxes
             WHERE status = 'active'
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let timeboxes: Vec<Timebox> = timebox_stmt
        .query_map([], Timebox::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut result = Vec::new();

    for timebox in timeboxes {
        let mut session_stmt = conn
            .prepare(
                "SELECT id, timebox_id, start_time, end_time, end_reason, created_at
                 FROM sessions
                 WHERE timebox_id = ?1
                 ORDER BY start_time DESC",
            )
            .map_err(|e| e.to_string())?;

        let sessions: Vec<Session> = session_stmt
            .query_map(params![timebox.id], Session::from_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let actual_duration: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM((julianday(COALESCE(end_time, datetime('now', 'localtime'))) - julianday(start_time)) * 1440), 0)
                 FROM sessions WHERE timebox_id = ?1",
                params![timebox.id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        result.push(TimeboxWithSessions {
            timebox,
            sessions,
            actual_duration,
        });
    }

    Ok(result)
}
