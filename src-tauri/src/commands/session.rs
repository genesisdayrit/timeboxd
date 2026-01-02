use crate::models::Session;
use crate::state::AppState;
use chrono::Local;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn get_sessions_for_timebox(
    state: State<'_, AppState>,
    timebox_id: i64,
) -> Result<Vec<Session>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, timebox_id, started_at, stopped_at, cancelled_at
             FROM sessions
             WHERE timebox_id = ?1
             ORDER BY started_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let sessions: Vec<Session> = stmt
        .query_map(params![timebox_id], Session::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(sessions)
}

#[tauri::command]
pub fn stop_session(state: State<'_, AppState>, session_id: i64) -> Result<Session, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Stop the session
    conn.execute(
        "UPDATE sessions SET stopped_at = ?1 WHERE id = ?2 AND stopped_at IS NULL AND cancelled_at IS NULL",
        params![now, session_id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated session
    let mut stmt = conn
        .prepare("SELECT id, timebox_id, started_at, stopped_at, cancelled_at FROM sessions WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let session = stmt
        .query_row(params![session_id], Session::from_row)
        .map_err(|e| e.to_string())?;

    Ok(session)
}

#[tauri::command]
pub fn cancel_session(state: State<'_, AppState>, session_id: i64) -> Result<Session, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Cancel the session
    conn.execute(
        "UPDATE sessions SET cancelled_at = ?1 WHERE id = ?2 AND stopped_at IS NULL AND cancelled_at IS NULL",
        params![now, session_id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated session
    let mut stmt = conn
        .prepare("SELECT id, timebox_id, started_at, stopped_at, cancelled_at FROM sessions WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let session = stmt
        .query_row(params![session_id], Session::from_row)
        .map_err(|e| e.to_string())?;

    Ok(session)
}

#[tauri::command]
pub fn get_active_session_for_timebox(
    state: State<'_, AppState>,
    timebox_id: i64,
) -> Result<Option<Session>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, timebox_id, started_at, stopped_at, cancelled_at
             FROM sessions
             WHERE timebox_id = ?1 AND stopped_at IS NULL AND cancelled_at IS NULL
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let session = stmt
        .query_row(params![timebox_id], Session::from_row)
        .ok();

    Ok(session)
}
