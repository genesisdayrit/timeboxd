use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeboxChangeLog {
    pub id: i64,
    pub timebox_id: i64,
    pub previous_intention_title: Option<String>,
    pub updated_intention_title: Option<String>,
    pub previous_note_content: Option<String>,
    pub updated_note_content: Option<String>,
    pub previous_intended_duration: Option<i64>,
    pub new_intended_duration: Option<i64>,
    pub updated_at: String,
}

impl TimeboxChangeLog {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(TimeboxChangeLog {
            id: row.get(0)?,
            timebox_id: row.get(1)?,
            previous_intention_title: row.get(2)?,
            updated_intention_title: row.get(3)?,
            previous_note_content: row.get(4)?,
            updated_note_content: row.get(5)?,
            previous_intended_duration: row.get(6)?,
            new_intended_duration: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }
}
