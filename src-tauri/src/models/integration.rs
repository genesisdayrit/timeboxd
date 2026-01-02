use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Integration {
    pub id: i64,
    pub connection_name: String,
    pub integration_type: String,
    pub connection_config: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

impl Integration {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        let config_str: String = row.get(3)?;
        let connection_config: serde_json::Value = serde_json::from_str(&config_str)
            .unwrap_or(serde_json::Value::Null);

        Ok(Integration {
            id: row.get(0)?,
            connection_name: row.get(1)?,
            integration_type: row.get(2)?,
            connection_config,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationRequest {
    pub connection_name: String,
    pub integration_type: String,
    pub connection_config: serde_json::Value,
}
