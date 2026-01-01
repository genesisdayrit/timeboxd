use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timebox {
    pub id: i64,
    pub description: String,
    pub intended_duration: f64,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimeboxRequest {
    pub description: String,
    pub intended_duration: f64,
}

impl Timebox {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Timebox {
            id: row.get(0)?,
            description: row.get(1)?,
            intended_duration: row.get(2)?,
            status: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }
}
