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
            "SELECT id, timebox_id, start_time, end_time, end_reason, created_at
             FROM sessions
             WHERE timebox_id = ?1
             ORDER BY start_time DESC",
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
pub fn expire_session(state: State<'_, AppState>, session_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Get the timebox_id for this session
    let timebox_id: i64 = conn
        .query_row(
            "SELECT timebox_id FROM sessions WHERE id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Close the session with auto_expired reason
    conn.execute(
        "UPDATE sessions SET end_time = ?1, end_reason = 'auto_expired' WHERE id = ?2",
        params![now, session_id],
    )
    .map_err(|e| e.to_string())?;

    // Update the timebox status to completed
    conn.execute(
        "UPDATE timeboxes SET status = 'completed', updated_at = ?1 WHERE id = ?2",
        params![now, timebox_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_active_session_for_timebox(
    state: State<'_, AppState>,
    timebox_id: i64,
) -> Result<Option<Session>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, timebox_id, start_time, end_time, end_reason, created_at
             FROM sessions
             WHERE timebox_id = ?1 AND end_time IS NULL
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let session = stmt
        .query_row(params![timebox_id], Session::from_row)
        .ok();

    Ok(session)
}
