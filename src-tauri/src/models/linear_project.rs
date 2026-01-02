use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinearProject {
    pub id: i64,
    pub linear_project_id: String,
    pub linear_team_id: String,
    pub name: String,
    pub description: Option<String>,
    pub state: Option<String>,
    pub is_active_timebox_project: bool,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveLinearProjectRequest {
    pub linear_project_id: String,
    pub linear_team_id: String,
    pub name: String,
    pub description: Option<String>,
    pub state: Option<String>,
}

impl LinearProject {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let is_active: i64 = row.get(6)?;
        Ok(LinearProject {
            id: row.get(0)?,
            linear_project_id: row.get(1)?,
            linear_team_id: row.get(2)?,
            name: row.get(3)?,
            description: row.get(4)?,
            state: row.get(5)?,
            is_active_timebox_project: is_active != 0,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            archived_at: row.get(9)?,
            deleted_at: row.get(10)?,
        })
    }
}
