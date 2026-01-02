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

    if version < 3 {
        // Drop old tables if they exist (fresh start for new schema)
        conn.execute_batch(r#"
            DROP TABLE IF EXISTS sessions;
            DROP TABLE IF EXISTS timebox_change_log;
            DROP TABLE IF EXISTS timeboxes;
        "#)?;

        conn.execute_batch(r#"
            -- Timeboxes: The planned time blocks
            -- status values: 'not_started', 'in_progress', 'paused', 'completed', 'cancelled', 'stopped'
            CREATE TABLE IF NOT EXISTS timeboxes (
                id                      INTEGER PRIMARY KEY AUTOINCREMENT,
                intention               TEXT NOT NULL,
                notes                   TEXT,
                intended_duration       INTEGER NOT NULL,
                status                  TEXT NOT NULL DEFAULT 'not_started',
                created_at              TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at              TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                started_at              TEXT,
                completed_at            TEXT,
                after_time_stopped_at   TEXT,
                deleted_at              TEXT,
                canceled_at             TEXT
            );

            -- Sessions: Each time a timebox is started/resumed, a session is created
            CREATE TABLE IF NOT EXISTS sessions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                timebox_id      INTEGER NOT NULL,
                started_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                stopped_at      TEXT,
                cancelled_at    TEXT,
                FOREIGN KEY (timebox_id) REFERENCES timeboxes(id) ON DELETE CASCADE
            );

            -- Timebox change log: Tracks changes to timeboxes
            CREATE TABLE IF NOT EXISTS timebox_change_log (
                id                          INTEGER PRIMARY KEY AUTOINCREMENT,
                timebox_id                  INTEGER NOT NULL,
                previous_intention_title    TEXT,
                updated_intention_title     TEXT,
                previous_note_content       TEXT,
                updated_note_content        TEXT,
                previous_intended_duration  INTEGER,
                new_intended_duration       INTEGER,
                updated_at                  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (timebox_id) REFERENCES timeboxes(id) ON DELETE CASCADE
            );

            -- Indexes for efficient queries
            CREATE INDEX IF NOT EXISTS idx_timeboxes_created_at ON timeboxes(created_at);
            CREATE INDEX IF NOT EXISTS idx_timeboxes_started_at ON timeboxes(started_at);
            CREATE INDEX IF NOT EXISTS idx_timeboxes_deleted_at ON timeboxes(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_timeboxes_status ON timeboxes(status);
            CREATE INDEX IF NOT EXISTS idx_sessions_timebox_id ON sessions(timebox_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_timebox_change_log_timebox_id ON timebox_change_log(timebox_id);

            PRAGMA user_version = 3;
        "#)?;
    }

    // Migration 4: Add display_order and archived_at columns
    if version < 4 {
        conn.execute_batch(r#"
            ALTER TABLE timeboxes ADD COLUMN display_order INTEGER;
            ALTER TABLE timeboxes ADD COLUMN archived_at TEXT;

            CREATE INDEX IF NOT EXISTS idx_timeboxes_display_order ON timeboxes(display_order);
            CREATE INDEX IF NOT EXISTS idx_timeboxes_archived_at ON timeboxes(archived_at);

            PRAGMA user_version = 4;
        "#)?;
    }

    // Migration 5: Add finished_at column for explicitly finished timeboxes
    if version < 5 {
        conn.execute_batch(r#"
            ALTER TABLE timeboxes ADD COLUMN finished_at TEXT;

            PRAGMA user_version = 5;
        "#)?;
    }

    Ok(())
}
