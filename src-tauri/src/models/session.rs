use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: i64,
    pub timebox_id: i64,
    pub start_time: String,
    pub end_time: Option<String>,
    pub end_reason: Option<String>,
    pub created_at: String,
}

impl Session {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Session {
            id: row.get(0)?,
            timebox_id: row.get(1)?,
            start_time: row.get(2)?,
            end_time: row.get(3)?,
            end_reason: row.get(4)?,
            created_at: row.get(5)?,
        })
    }
}
