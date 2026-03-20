use crate::models::_entities::sleep_records::ActiveModel as SleepActiveModel;
use loco_rs::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub struct FitbitSyncWorker {
    pub ctx: AppContext,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct FitbitSyncArgs {
    pub user_id: i32,
    pub fitbit_connection_id: i32,
    pub date: String,
}

#[async_trait]
impl BackgroundWorker<FitbitSyncArgs> for FitbitSyncWorker {
    fn build(ctx: &AppContext) -> Self {
        Self { ctx: ctx.clone() }
    }

    async fn perform(&self, args: FitbitSyncArgs) -> Result<()> {
        let conn = crate::models::_entities::fitbit_connections::Entity::find_by_id(
            args.fitbit_connection_id,
        )
        .one(&self.ctx.db)
        .await?
        .ok_or_else(|| Error::BadRequest("fitbit connection not found".to_string()))?;

        let key_str = std::env::var("FITBIT_TOKEN_KEY")
            .unwrap_or_else(|_| "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".to_string());
        use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
        let key_bytes = BASE64
            .decode(&key_str)
            .map_err(|e| Error::Any(anyhow::anyhow!("key decode error: {}", e).into()))?;
        let mut key = [0u8; 32];
        if key_bytes.len() >= 32 {
            key.copy_from_slice(&key_bytes[..32]);
        }

        let access_token = conn.decrypt_access_token(&key)?;

        let client = reqwest::Client::new();
        let url = format!(
            "https://api.fitbit.com/1.2/user/-/sleep/date/{}.json",
            args.date
        );

        let response = client
            .get(&url)
            .bearer_auth(&access_token)
            .send()
            .await
            .map_err(|e| Error::Any(e.into()))?;

        if !response.status().is_success() {
            tracing::error!("Fitbit sleep API failed: {}", response.status());
            return Err(Error::BadRequest("Fitbit API request failed".to_string()));
        }

        let data: serde_json::Value = response.json().await.map_err(|e| Error::Any(e.into()))?;

        let tz = chrono::FixedOffset::east_opt(0).unwrap();

        if let Some(sleep_logs) = data["sleep"].as_array() {
            for log in sleep_logs {
                let fitbit_log_id = log["logId"].as_i64().unwrap_or(0);

                // Check for duplicate
                use crate::models::_entities::sleep_records::{Column, Entity};
                let existing = Entity::find()
                    .filter(Column::FitbitLogId.eq(fitbit_log_id))
                    .one(&self.ctx.db)
                    .await?;

                if existing.is_some() {
                    continue;
                }

                let start_str = log["startTime"].as_str().unwrap_or("");
                let end_str = log["endTime"].as_str().unwrap_or("");

                let sleep_start = chrono::DateTime::parse_from_rfc3339(start_str)
                    .unwrap_or_else(|_| {
                        chrono::Utc::now().with_timezone(&tz)
                    });
                let sleep_end = chrono::DateTime::parse_from_rfc3339(end_str)
                    .unwrap_or_else(|_| {
                        chrono::Utc::now().with_timezone(&tz)
                    });

                let duration_ms = log["duration"].as_i64().unwrap_or(0);
                let duration_minutes = (duration_ms / 60000) as i32;
                let efficiency = log["efficiency"].as_i64().map(|e| e as i32);
                let is_main_sleep = log["isMainSleep"].as_bool().unwrap_or(false);

                let levels = &log["levels"]["summary"];
                let deep = levels["deep"]["minutes"].as_i64().map(|v| v as i32);
                let light = levels["light"]["minutes"].as_i64().map(|v| v as i32);
                let rem = levels["rem"]["minutes"].as_i64().map(|v| v as i32);
                let wake = levels["wake"]["minutes"].as_i64().map(|v| v as i32);

                let record = SleepActiveModel {
                    pid: Set(Uuid::new_v4()),
                    user_id: Set(args.user_id),
                    fitbit_log_id: Set(Some(fitbit_log_id)),
                    sleep_start: Set(sleep_start.with_timezone(&tz)),
                    sleep_end: Set(sleep_end.with_timezone(&tz)),
                    duration_minutes: Set(duration_minutes),
                    efficiency: Set(efficiency),
                    stages_deep_minutes: Set(deep),
                    stages_light_minutes: Set(light),
                    stages_rem_minutes: Set(rem),
                    stages_wake_minutes: Set(wake),
                    is_main_sleep: Set(is_main_sleep),
                    source: Set("fitbit".to_string()),
                    ..Default::default()
                };

                record.insert(&self.ctx.db).await?;
            }
        }

        // Update last_synced_at
        if let Some(conn_model) = crate::models::_entities::fitbit_connections::Entity::find_by_id(
            args.fitbit_connection_id,
        )
        .one(&self.ctx.db)
        .await?
        {
            let mut active: crate::models::_entities::fitbit_connections::ActiveModel =
                conn_model.into();
            active.last_synced_at = Set(Some(chrono::Utc::now().with_timezone(&tz)));
            active.update(&self.ctx.db).await?;
        }

        Ok(())
    }
}
