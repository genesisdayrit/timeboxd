use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TimeboxStatus {
    #[serde(rename = "not_started")]
    NotStarted,
    #[serde(rename = "in_progress")]
    InProgress,
    #[serde(rename = "paused")]
    Paused,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "stopped")]
    Stopped,
}

impl TimeboxStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TimeboxStatus::NotStarted => "not_started",
            TimeboxStatus::InProgress => "in_progress",
            TimeboxStatus::Paused => "paused",
            TimeboxStatus::Completed => "completed",
            TimeboxStatus::Cancelled => "cancelled",
            TimeboxStatus::Stopped => "stopped",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "not_started" => TimeboxStatus::NotStarted,
            "in_progress" => TimeboxStatus::InProgress,
            "paused" => TimeboxStatus::Paused,
            "completed" => TimeboxStatus::Completed,
            "cancelled" => TimeboxStatus::Cancelled,
            "stopped" => TimeboxStatus::Stopped,
            _ => TimeboxStatus::NotStarted,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timebox {
    pub id: i64,
    pub intention: String,
    pub notes: Option<String>,
    pub intended_duration: i64, // in seconds
    pub status: TimeboxStatus,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub after_time_stopped_at: Option<String>,
    pub deleted_at: Option<String>,
    pub canceled_at: Option<String>,
    pub display_order: Option<i64>,
    pub archived_at: Option<String>,
    pub finished_at: Option<String>,
    pub linear_project_id: Option<i64>,
    pub linear_issue_id: Option<String>,
    pub linear_issue_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimeboxRequest {
    pub intention: String,
    pub intended_duration: i64, // in seconds
    pub notes: Option<String>,
    pub linear_project_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTimeboxRequest {
    pub intention: Option<String>,
    pub notes: Option<String>,
    pub intended_duration: Option<i64>,
}

impl Timebox {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let status_str: String = row.get(4)?;
        Ok(Timebox {
            id: row.get(0)?,
            intention: row.get(1)?,
            notes: row.get(2)?,
            intended_duration: row.get(3)?,
            status: TimeboxStatus::from_str(&status_str),
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            started_at: row.get(7)?,
            completed_at: row.get(8)?,
            after_time_stopped_at: row.get(9)?,
            deleted_at: row.get(10)?,
            canceled_at: row.get(11)?,
            display_order: row.get(12)?,
            archived_at: row.get(13)?,
            finished_at: row.get(14)?,
            linear_project_id: row.get(15)?,
            linear_issue_id: row.get(16)?,
            linear_issue_url: row.get(17)?,
        })
    }
}
