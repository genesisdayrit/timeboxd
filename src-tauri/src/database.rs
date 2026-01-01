use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_dir = app_handle.path().app_data_dir()?;
    fs::create_dir_all(&app_dir)?;
    Ok(app_dir.join("timeboxd.db"))
}

pub fn initialize_database(app_handle: &AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(db_path)?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    run_migrations(&conn)?;

    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    let version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(r#"
            -- Timeboxes: The planned time blocks with description and intended duration
            CREATE TABLE IF NOT EXISTS timeboxes (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                description     TEXT NOT NULL,
                intended_duration REAL NOT NULL,
                status          TEXT NOT NULL DEFAULT 'pending',
                created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            -- Sessions: Each time a timebox is started, a session is created
            CREATE TABLE IF NOT EXISTS sessions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                timebox_id      INTEGER NOT NULL,
                start_time      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                end_time        TEXT,
                end_reason      TEXT,
                created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (timebox_id) REFERENCES timeboxes(id) ON DELETE CASCADE
            );

            -- Indexes for efficient queries
            CREATE INDEX IF NOT EXISTS idx_timeboxes_status ON timeboxes(status);
            CREATE INDEX IF NOT EXISTS idx_timeboxes_created_at ON timeboxes(created_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_timebox_id ON sessions(timebox_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
            CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON sessions(end_time);

            PRAGMA user_version = 1;
        "#)?;
    }

    Ok(())
}
