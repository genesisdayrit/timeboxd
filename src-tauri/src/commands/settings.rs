use crate::state::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct IdleSettings {
    pub enabled: bool,
    pub timeout_minutes: i32,
}

#[tauri::command]
pub fn get_idle_settings(state: State<'_, AppState>) -> Result<IdleSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let enabled: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'auto_stop_enabled'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "true".to_string());

    let timeout_minutes: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'idle_timeout_minutes'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "5".to_string());

    Ok(IdleSettings {
        enabled: enabled == "true",
        timeout_minutes: timeout_minutes.parse().unwrap_or(5),
    })
}

#[tauri::command]
pub fn set_idle_settings(state: State<'_, AppState>, settings: IdleSettings) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auto_stop_enabled', ?1, datetime('now', 'localtime'))",
        params![if settings.enabled { "true" } else { "false" }],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('idle_timeout_minutes', ?1, datetime('now', 'localtime'))",
        params![settings.timeout_minutes.to_string()],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
