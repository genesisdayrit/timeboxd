#[cfg(test)]
mod tests {
    use rusqlite::{Connection, params};

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("Failed to create in-memory database");
        conn.execute("PRAGMA foreign_keys = ON", []).unwrap();

        // Run the same migrations as in database.rs
        conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS timeboxes (
                id                      INTEGER PRIMARY KEY AUTOINCREMENT,
                intention               TEXT NOT NULL,
                notes                   TEXT,
                intended_duration       INTEGER NOT NULL,
                created_at              TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at              TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                started_at              TEXT,
                completed_at            TEXT,
                after_time_stopped_at   TEXT,
                deleted_at              TEXT,
                canceled_at             TEXT
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                timebox_id      INTEGER NOT NULL,
                started_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                stopped_at      TEXT,
                cancelled_at    TEXT,
                FOREIGN KEY (timebox_id) REFERENCES timeboxes(id) ON DELETE CASCADE
            );

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

            CREATE INDEX IF NOT EXISTS idx_timeboxes_created_at ON timeboxes(created_at);
            CREATE INDEX IF NOT EXISTS idx_timeboxes_started_at ON timeboxes(started_at);
            CREATE INDEX IF NOT EXISTS idx_timeboxes_deleted_at ON timeboxes(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_timebox_id ON sessions(timebox_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_timebox_change_log_timebox_id ON timebox_change_log(timebox_id);
        "#).expect("Failed to create tables");

        conn
    }

    // ==================== TIMEBOXES TABLE TESTS ====================

    #[test]
    fn test_timeboxes_table_exists() {
        let conn = setup_test_db();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='timeboxes'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "timeboxes table should exist");
    }

    #[test]
    fn test_timeboxes_insert_with_required_fields() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test intention", 1800],
        )
        .expect("Should insert timebox with required fields");

        let id = conn.last_insert_rowid();
        assert!(id > 0, "Should return valid ID");
    }

    #[test]
    fn test_timeboxes_insert_with_all_fields() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, notes, intended_duration, started_at, completed_at, after_time_stopped_at, deleted_at, canceled_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "Full timebox",
                "Some notes",
                3600,
                "2024-01-01 10:00:00",
                "2024-01-01 11:00:00",
                None::<String>,
                None::<String>,
                None::<String>
            ],
        )
        .expect("Should insert timebox with all fields");
    }

    #[test]
    fn test_timeboxes_required_intention() {
        let conn = setup_test_db();

        let result = conn.execute(
            "INSERT INTO timeboxes (intended_duration) VALUES (?1)",
            params![1800],
        );

        assert!(result.is_err(), "Should fail without intention");
    }

    #[test]
    fn test_timeboxes_required_intended_duration() {
        let conn = setup_test_db();

        let result = conn.execute(
            "INSERT INTO timeboxes (intention) VALUES (?1)",
            params!["Test"],
        );

        assert!(result.is_err(), "Should fail without intended_duration");
    }

    #[test]
    fn test_timeboxes_default_timestamps() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        let (created_at, updated_at): (String, String) = conn
            .query_row(
                "SELECT created_at, updated_at FROM timeboxes WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert!(!created_at.is_empty(), "created_at should be set");
        assert!(!updated_at.is_empty(), "updated_at should be set");
    }

    #[test]
    fn test_timeboxes_nullable_timestamp_fields() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        let (started_at, completed_at, after_time_stopped_at, deleted_at, canceled_at): (
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
        ) = conn
            .query_row(
                "SELECT started_at, completed_at, after_time_stopped_at, deleted_at, canceled_at FROM timeboxes WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )
            .unwrap();

        assert!(started_at.is_none(), "started_at should be NULL by default");
        assert!(completed_at.is_none(), "completed_at should be NULL by default");
        assert!(after_time_stopped_at.is_none(), "after_time_stopped_at should be NULL by default");
        assert!(deleted_at.is_none(), "deleted_at should be NULL by default");
        assert!(canceled_at.is_none(), "canceled_at should be NULL by default");
    }

    #[test]
    fn test_timeboxes_intended_duration_is_integer() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800_i64],
        )
        .unwrap();

        let duration: i64 = conn
            .query_row(
                "SELECT intended_duration FROM timeboxes WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(duration, 1800, "intended_duration should be stored as integer (seconds)");
    }

    // ==================== SESSIONS TABLE TESTS ====================

    #[test]
    fn test_sessions_table_exists() {
        let conn = setup_test_db();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sessions'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "sessions table should exist");
    }

    #[test]
    fn test_sessions_insert_with_valid_timebox() {
        let conn = setup_test_db();

        // Create a timebox first
        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        // Create a session
        conn.execute(
            "INSERT INTO sessions (timebox_id) VALUES (?1)",
            params![1],
        )
        .expect("Should insert session with valid timebox_id");
    }

    #[test]
    fn test_sessions_foreign_key_constraint() {
        let conn = setup_test_db();

        let result = conn.execute(
            "INSERT INTO sessions (timebox_id) VALUES (?1)",
            params![999], // Non-existent timebox
        );

        assert!(result.is_err(), "Should fail with invalid timebox_id due to foreign key constraint");
    }

    #[test]
    fn test_sessions_cascade_delete() {
        let conn = setup_test_db();

        // Create a timebox
        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        // Create sessions
        conn.execute("INSERT INTO sessions (timebox_id) VALUES (1)", []).unwrap();
        conn.execute("INSERT INTO sessions (timebox_id) VALUES (1)", []).unwrap();

        // Verify sessions exist
        let session_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM sessions WHERE timebox_id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(session_count, 2, "Should have 2 sessions");

        // Delete the timebox
        conn.execute("DELETE FROM timeboxes WHERE id = 1", []).unwrap();

        // Verify sessions are deleted
        let session_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM sessions WHERE timebox_id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(session_count, 0, "Sessions should be cascade deleted");
    }

    #[test]
    fn test_sessions_default_started_at() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        conn.execute("INSERT INTO sessions (timebox_id) VALUES (1)", []).unwrap();

        let started_at: String = conn
            .query_row("SELECT started_at FROM sessions WHERE id = 1", [], |row| row.get(0))
            .unwrap();

        assert!(!started_at.is_empty(), "started_at should be set by default");
    }

    #[test]
    fn test_sessions_nullable_stopped_at_and_cancelled_at() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        conn.execute("INSERT INTO sessions (timebox_id) VALUES (1)", []).unwrap();

        let (stopped_at, cancelled_at): (Option<String>, Option<String>) = conn
            .query_row(
                "SELECT stopped_at, cancelled_at FROM sessions WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert!(stopped_at.is_none(), "stopped_at should be NULL by default");
        assert!(cancelled_at.is_none(), "cancelled_at should be NULL by default");
    }

    #[test]
    fn test_sessions_can_set_stopped_at() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        conn.execute("INSERT INTO sessions (timebox_id) VALUES (1)", []).unwrap();

        conn.execute(
            "UPDATE sessions SET stopped_at = datetime('now', 'localtime') WHERE id = 1",
            [],
        )
        .unwrap();

        let stopped_at: Option<String> = conn
            .query_row("SELECT stopped_at FROM sessions WHERE id = 1", [], |row| row.get(0))
            .unwrap();

        assert!(stopped_at.is_some(), "stopped_at should be set after update");
    }

    #[test]
    fn test_sessions_can_set_cancelled_at() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        conn.execute("INSERT INTO sessions (timebox_id) VALUES (1)", []).unwrap();

        conn.execute(
            "UPDATE sessions SET cancelled_at = datetime('now', 'localtime') WHERE id = 1",
            [],
        )
        .unwrap();

        let cancelled_at: Option<String> = conn
            .query_row("SELECT cancelled_at FROM sessions WHERE id = 1", [], |row| row.get(0))
            .unwrap();

        assert!(cancelled_at.is_some(), "cancelled_at should be set after update");
    }

    // ==================== TIMEBOX_CHANGE_LOG TABLE TESTS ====================

    #[test]
    fn test_timebox_change_log_table_exists() {
        let conn = setup_test_db();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='timebox_change_log'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "timebox_change_log table should exist");
    }

    #[test]
    fn test_timebox_change_log_insert() {
        let conn = setup_test_db();

        // Create a timebox first
        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Original intention", 1800],
        )
        .unwrap();

        // Log a change
        conn.execute(
            "INSERT INTO timebox_change_log (timebox_id, previous_intention_title, updated_intention_title) VALUES (?1, ?2, ?3)",
            params![1, "Original intention", "Updated intention"],
        )
        .expect("Should insert change log entry");
    }

    #[test]
    fn test_timebox_change_log_foreign_key_constraint() {
        let conn = setup_test_db();

        let result = conn.execute(
            "INSERT INTO timebox_change_log (timebox_id, previous_intention_title, updated_intention_title) VALUES (?1, ?2, ?3)",
            params![999, "Old", "New"], // Non-existent timebox
        );

        assert!(result.is_err(), "Should fail with invalid timebox_id due to foreign key constraint");
    }

    #[test]
    fn test_timebox_change_log_cascade_delete() {
        let conn = setup_test_db();

        // Create a timebox
        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        // Create change log entries
        conn.execute(
            "INSERT INTO timebox_change_log (timebox_id, previous_intention_title, updated_intention_title) VALUES (1, 'Old1', 'New1')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO timebox_change_log (timebox_id, previous_note_content, updated_note_content) VALUES (1, 'OldNote', 'NewNote')",
            [],
        )
        .unwrap();

        // Verify entries exist
        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM timebox_change_log WHERE timebox_id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 2, "Should have 2 change log entries");

        // Delete the timebox
        conn.execute("DELETE FROM timeboxes WHERE id = 1", []).unwrap();

        // Verify entries are deleted
        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM timebox_change_log WHERE timebox_id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0, "Change log entries should be cascade deleted");
    }

    #[test]
    fn test_timebox_change_log_all_fields_nullable_except_timebox_id() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        // Insert with only timebox_id (all other fields NULL)
        conn.execute(
            "INSERT INTO timebox_change_log (timebox_id) VALUES (1)",
            [],
        )
        .expect("Should insert with only timebox_id");

        let (prev_intention, upd_intention, prev_note, upd_note, prev_duration, new_duration): (
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<i64>,
            Option<i64>,
        ) = conn
            .query_row(
                "SELECT previous_intention_title, updated_intention_title, previous_note_content, updated_note_content, previous_intended_duration, new_intended_duration FROM timebox_change_log WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?)),
            )
            .unwrap();

        assert!(prev_intention.is_none());
        assert!(upd_intention.is_none());
        assert!(prev_note.is_none());
        assert!(upd_note.is_none());
        assert!(prev_duration.is_none());
        assert!(new_duration.is_none());
    }

    #[test]
    fn test_timebox_change_log_default_updated_at() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        conn.execute("INSERT INTO timebox_change_log (timebox_id) VALUES (1)", []).unwrap();

        let updated_at: String = conn
            .query_row("SELECT updated_at FROM timebox_change_log WHERE id = 1", [], |row| row.get(0))
            .unwrap();

        assert!(!updated_at.is_empty(), "updated_at should be set by default");
    }

    #[test]
    fn test_timebox_change_log_duration_fields_are_integers() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO timebox_change_log (timebox_id, previous_intended_duration, new_intended_duration) VALUES (1, 1800, 3600)",
            [],
        )
        .unwrap();

        let (prev_duration, new_duration): (i64, i64) = conn
            .query_row(
                "SELECT previous_intended_duration, new_intended_duration FROM timebox_change_log WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(prev_duration, 1800);
        assert_eq!(new_duration, 3600);
    }

    // ==================== INDEX TESTS ====================

    #[test]
    fn test_indexes_exist() {
        let conn = setup_test_db();

        let indexes = vec![
            "idx_timeboxes_created_at",
            "idx_timeboxes_started_at",
            "idx_timeboxes_deleted_at",
            "idx_sessions_timebox_id",
            "idx_sessions_started_at",
            "idx_timebox_change_log_timebox_id",
        ];

        for index_name in indexes {
            let count: i32 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?1",
                    params![index_name],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "Index {} should exist", index_name);
        }
    }

    // ==================== INTEGRATION TESTS ====================

    #[test]
    fn test_full_timebox_lifecycle() {
        let conn = setup_test_db();

        // 1. Create a timebox
        conn.execute(
            "INSERT INTO timeboxes (intention, notes, intended_duration) VALUES (?1, ?2, ?3)",
            params!["Write code", "Focus on tests", 1800],
        )
        .unwrap();

        // 2. Start the timebox
        conn.execute(
            "UPDATE timeboxes SET started_at = datetime('now', 'localtime'), updated_at = datetime('now', 'localtime') WHERE id = 1",
            [],
        )
        .unwrap();

        // 3. Create a session
        conn.execute("INSERT INTO sessions (timebox_id) VALUES (1)", []).unwrap();

        // 4. Update the intention (log the change)
        conn.execute(
            "INSERT INTO timebox_change_log (timebox_id, previous_intention_title, updated_intention_title) VALUES (1, 'Write code', 'Write tests')",
            [],
        )
        .unwrap();
        conn.execute(
            "UPDATE timeboxes SET intention = 'Write tests', updated_at = datetime('now', 'localtime') WHERE id = 1",
            [],
        )
        .unwrap();

        // 5. Stop the session
        conn.execute(
            "UPDATE sessions SET stopped_at = datetime('now', 'localtime') WHERE id = 1",
            [],
        )
        .unwrap();

        // 6. Complete the timebox
        conn.execute(
            "UPDATE timeboxes SET completed_at = datetime('now', 'localtime'), updated_at = datetime('now', 'localtime') WHERE id = 1",
            [],
        )
        .unwrap();

        // Verify final state
        let (intention, started_at, completed_at): (String, Option<String>, Option<String>) = conn
            .query_row(
                "SELECT intention, started_at, completed_at FROM timeboxes WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();

        assert_eq!(intention, "Write tests");
        assert!(started_at.is_some());
        assert!(completed_at.is_some());

        // Verify session was stopped
        let stopped_at: Option<String> = conn
            .query_row("SELECT stopped_at FROM sessions WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert!(stopped_at.is_some());

        // Verify change log entry
        let change_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM timebox_change_log WHERE timebox_id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(change_count, 1);
    }

    #[test]
    fn test_multiple_sessions_per_timebox() {
        let conn = setup_test_db();

        // Create a timebox
        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Work session", 1800],
        )
        .unwrap();

        // Create multiple sessions (simulating pause/resume)
        for i in 1..=3 {
            conn.execute(
                "INSERT INTO sessions (timebox_id, started_at) VALUES (1, ?1)",
                params![format!("2024-01-01 {:02}:00:00", 9 + i)],
            )
            .unwrap();
        }

        let session_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM sessions WHERE timebox_id = 1", [], |row| row.get(0))
            .unwrap();

        assert_eq!(session_count, 3, "Should have 3 sessions for one timebox");
    }

    #[test]
    fn test_soft_delete_timebox() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO timeboxes (intention, intended_duration) VALUES (?1, ?2)",
            params!["Test", 1800],
        )
        .unwrap();

        // Soft delete
        conn.execute(
            "UPDATE timeboxes SET deleted_at = datetime('now', 'localtime') WHERE id = 1",
            [],
        )
        .unwrap();

        // Verify it's still in the database but marked as deleted
        let (deleted_at, count): (Option<String>, i32) = conn
            .query_row(
                "SELECT deleted_at, (SELECT COUNT(*) FROM timeboxes WHERE id = 1) FROM timeboxes WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert!(deleted_at.is_some(), "deleted_at should be set");
        assert_eq!(count, 1, "Timebox should still exist in database");

        // Query for non-deleted timeboxes should exclude it
        let active_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM timeboxes WHERE deleted_at IS NULL", [], |row| row.get(0))
            .unwrap();
        assert_eq!(active_count, 0, "No active timeboxes should be found");
    }
}
