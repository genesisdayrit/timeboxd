use crate::models::{CreateTimeboxRequest, Session, Timebox, TimeboxChangeLog, TimeboxStatus, UpdateTimeboxRequest};
use crate::state::AppState;
use chrono::Local;
use rusqlite::params;
use tauri::State;

const TIMEBOX_SELECT_COLUMNS: &str = "id, intention, notes, intended_duration, status, created_at, updated_at, started_at, completed_at, after_time_stopped_at, deleted_at, canceled_at, display_order, archived_at, finished_at";

#[tauri::command]
pub fn create_timebox(
    state: State<'_, AppState>,
    request: CreateTimeboxRequest,
) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO timeboxes (intention, intended_duration, notes) VALUES (?1, ?2, ?3)",
        params![request.intention, request.intended_duration, request.notes],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn update_timebox(
    state: State<'_, AppState>,
    id: i64,
    request: UpdateTimeboxRequest,
) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Get current timebox state for change log
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1 AND deleted_at IS NULL", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let current: Timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    // Determine new values (use request value if provided, otherwise keep current)
    let new_intention = request.intention.clone().unwrap_or(current.intention.clone());
    let new_notes = if request.notes.is_some() { request.notes.clone() } else { current.notes.clone() };
    let new_duration = request.intended_duration.unwrap_or(current.intended_duration);

    // Log changes if any field is being updated
    let has_intention_change = new_intention != current.intention;
    let has_notes_change = new_notes != current.notes;
    let has_duration_change = new_duration != current.intended_duration;

    if has_intention_change || has_notes_change || has_duration_change {
        conn.execute(
            "INSERT INTO timebox_change_log (timebox_id, previous_intention_title, updated_intention_title, previous_note_content, updated_note_content, previous_intended_duration, new_intended_duration, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                if has_intention_change { Some(&current.intention) } else { None::<&String> },
                if has_intention_change { Some(&new_intention) } else { None::<&String> },
                if has_notes_change { current.notes.as_ref() } else { None::<&String> },
                if has_notes_change { new_notes.as_ref() } else { None::<&String> },
                if has_duration_change { Some(current.intended_duration) } else { None::<i64> },
                if has_duration_change { Some(new_duration) } else { None::<i64> },
                now
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "UPDATE timeboxes SET intention = ?1, notes = ?2, intended_duration = ?3, updated_at = ?4 WHERE id = ?5",
        params![new_intention, new_notes, new_duration, now, id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
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

    // Check if this is the first start (started_at is null)
    let started_at: Option<String> = conn
        .query_row(
            "SELECT started_at FROM timeboxes WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Update timebox - set started_at only if first time, always set status to in_progress
    // Also clear completed_at so a stopped timebox can be restarted and appear in active list
    if started_at.is_none() {
        conn.execute(
            "UPDATE timeboxes SET started_at = ?1, status = ?2, updated_at = ?1 WHERE id = ?3",
            params![now, TimeboxStatus::InProgress.as_str(), id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE timeboxes SET status = ?1, completed_at = NULL, updated_at = ?2 WHERE id = ?3",
            params![TimeboxStatus::InProgress.as_str(), now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Create a new session
    conn.execute(
        "INSERT INTO sessions (timebox_id, started_at) VALUES (?1, ?2)",
        params![id, now],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
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
        "UPDATE sessions SET stopped_at = ?1 WHERE timebox_id = ?2 AND stopped_at IS NULL AND cancelled_at IS NULL",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update timebox - set completed_at and status to stopped (user manually stopped)
    conn.execute(
        "UPDATE timeboxes SET completed_at = ?1, status = ?2, updated_at = ?1 WHERE id = ?3",
        params![now, TimeboxStatus::Stopped.as_str(), id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn finish_timebox(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Close any open sessions for this timebox
    conn.execute(
        "UPDATE sessions SET stopped_at = ?1 WHERE timebox_id = ?2 AND stopped_at IS NULL AND cancelled_at IS NULL",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update timebox - set finished_at and status to completed (user explicitly finished)
    conn.execute(
        "UPDATE timeboxes SET finished_at = ?1, completed_at = ?1, status = ?2, updated_at = ?1 WHERE id = ?3",
        params![now, TimeboxStatus::Completed.as_str(), id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn stop_timebox_after_time(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Close any open sessions for this timebox
    conn.execute(
        "UPDATE sessions SET stopped_at = ?1 WHERE timebox_id = ?2 AND stopped_at IS NULL AND cancelled_at IS NULL",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update timebox - set after_time_stopped_at (timer expired naturally) and status to completed
    conn.execute(
        "UPDATE timeboxes SET after_time_stopped_at = ?1, completed_at = ?1, status = ?2, updated_at = ?1 WHERE id = ?3",
        params![now, TimeboxStatus::Completed.as_str(), id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
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

    // Close any open sessions for this timebox with cancelled_at
    conn.execute(
        "UPDATE sessions SET cancelled_at = ?1 WHERE timebox_id = ?2 AND stopped_at IS NULL AND cancelled_at IS NULL",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update timebox - set canceled_at and status to cancelled
    conn.execute(
        "UPDATE timeboxes SET canceled_at = ?1, status = ?2, updated_at = ?1 WHERE id = ?3",
        params![now, TimeboxStatus::Cancelled.as_str(), id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn pause_timebox(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Close any open sessions for this timebox
    conn.execute(
        "UPDATE sessions SET stopped_at = ?1 WHERE timebox_id = ?2 AND stopped_at IS NULL AND cancelled_at IS NULL",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update timebox - set status to paused
    conn.execute(
        "UPDATE timeboxes SET status = ?1, updated_at = ?2 WHERE id = ?3",
        params![TimeboxStatus::Paused.as_str(), now, id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn delete_timebox(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Soft delete - set deleted_at
    conn.execute(
        "UPDATE timeboxes SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated timebox
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
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
        .prepare(&format!(
            "SELECT {}
             FROM timeboxes
             WHERE date(created_at) = date('now', 'localtime')
               AND deleted_at IS NULL
               AND archived_at IS NULL
             ORDER BY COALESCE(display_order, 999999), created_at DESC",
            TIMEBOX_SELECT_COLUMNS
        ))
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
                "SELECT id, timebox_id, started_at, stopped_at, cancelled_at
                 FROM sessions
                 WHERE timebox_id = ?1
                 ORDER BY started_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let sessions: Vec<Session> = session_stmt
            .query_map(params![timebox.id], Session::from_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        // Calculate actual duration in seconds (using stopped_at or current time for active sessions)
        let actual_duration: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM((julianday(COALESCE(stopped_at, datetime('now', 'localtime'))) - julianday(started_at)) * 86400), 0)
                 FROM sessions WHERE timebox_id = ?1 AND cancelled_at IS NULL",
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

    // Active = started but not completed, not stopped after time, not canceled, not deleted
    let mut timebox_stmt = conn
        .prepare(&format!(
            "SELECT {}
             FROM timeboxes
             WHERE started_at IS NOT NULL
               AND completed_at IS NULL
               AND after_time_stopped_at IS NULL
               AND canceled_at IS NULL
               AND deleted_at IS NULL
             ORDER BY created_at DESC",
            TIMEBOX_SELECT_COLUMNS
        ))
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
                "SELECT id, timebox_id, started_at, stopped_at, cancelled_at
                 FROM sessions
                 WHERE timebox_id = ?1
                 ORDER BY started_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let sessions: Vec<Session> = session_stmt
            .query_map(params![timebox.id], Session::from_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let actual_duration: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM((julianday(COALESCE(stopped_at, datetime('now', 'localtime'))) - julianday(started_at)) * 86400), 0)
                 FROM sessions WHERE timebox_id = ?1 AND cancelled_at IS NULL",
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
pub fn get_timebox_change_log(
    state: State<'_, AppState>,
    timebox_id: i64,
) -> Result<Vec<TimeboxChangeLog>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, timebox_id, previous_intention_title, updated_intention_title, previous_note_content, updated_note_content, previous_intended_duration, new_intended_duration, updated_at
             FROM timebox_change_log
             WHERE timebox_id = ?1
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let logs: Vec<TimeboxChangeLog> = stmt
        .query_map(params![timebox_id], TimeboxChangeLog::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(logs)
}

#[derive(Debug, serde::Deserialize)]
pub struct ReorderTimeboxRequest {
    pub id: i64,
    pub display_order: i64,
}

#[tauri::command]
pub fn reorder_timeboxes(
    state: State<'_, AppState>,
    orders: Vec<ReorderTimeboxRequest>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    for order in orders {
        conn.execute(
            "UPDATE timeboxes SET display_order = ?1, updated_at = ?2 WHERE id = ?3",
            params![order.display_order, now, order.id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn archive_timebox(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE timeboxes SET archived_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn unarchive_timebox(state: State<'_, AppState>, id: i64) -> Result<Timebox, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE timeboxes SET archived_at = NULL, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM timeboxes WHERE id = ?1", TIMEBOX_SELECT_COLUMNS))
        .map_err(|e| e.to_string())?;

    let timebox = stmt
        .query_row(params![id], Timebox::from_row)
        .map_err(|e| e.to_string())?;

    Ok(timebox)
}

#[tauri::command]
pub fn get_archived_timeboxes(state: State<'_, AppState>) -> Result<Vec<TimeboxWithSessions>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut timebox_stmt = conn
        .prepare(&format!(
            "SELECT {}
             FROM timeboxes
             WHERE date(created_at) = date('now', 'localtime')
               AND deleted_at IS NULL
               AND archived_at IS NOT NULL
             ORDER BY archived_at DESC",
            TIMEBOX_SELECT_COLUMNS
        ))
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
                "SELECT id, timebox_id, started_at, stopped_at, cancelled_at
                 FROM sessions
                 WHERE timebox_id = ?1
                 ORDER BY started_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let sessions: Vec<Session> = session_stmt
            .query_map(params![timebox.id], Session::from_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let actual_duration: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM((julianday(COALESCE(stopped_at, datetime('now', 'localtime'))) - julianday(started_at)) * 86400), 0)
                 FROM sessions WHERE timebox_id = ?1 AND cancelled_at IS NULL",
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
