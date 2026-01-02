use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timebox {
    pub id: i64,
    pub intention: String,
    pub notes: Option<String>,
    pub intended_duration: i64, // in seconds
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub after_time_stopped_at: Option<String>,
    pub deleted_at: Option<String>,
    pub canceled_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimeboxRequest {
    pub intention: String,
    pub intended_duration: i64, // in seconds
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTimeboxRequest {
    pub intention: Option<String>,
    pub notes: Option<String>,
    pub intended_duration: Option<i64>,
}

impl Timebox {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Timebox {
            id: row.get(0)?,
            intention: row.get(1)?,
            notes: row.get(2)?,
            intended_duration: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            started_at: row.get(6)?,
            completed_at: row.get(7)?,
            after_time_stopped_at: row.get(8)?,
            deleted_at: row.get(9)?,
            canceled_at: row.get(10)?,
        })
    }
}
