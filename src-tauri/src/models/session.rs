use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: i64,
    pub timebox_id: i64,
    pub started_at: String,
    pub stopped_at: Option<String>,
    pub cancelled_at: Option<String>,
}

impl Session {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Session {
            id: row.get(0)?,
            timebox_id: row.get(1)?,
            started_at: row.get(2)?,
            stopped_at: row.get(3)?,
            cancelled_at: row.get(4)?,
        })
    }
}
