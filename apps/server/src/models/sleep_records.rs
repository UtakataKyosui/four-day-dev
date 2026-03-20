pub use crate::models::_entities::sleep_records::{self, ActiveModel, Column, Entity, Model};
use chrono::{DateTime, Utc};
use loco_rs::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateSleepParams {
    pub sleep_start: DateTime<Utc>,
    pub sleep_end: DateTime<Utc>,
    pub duration_minutes: i32,
    pub efficiency: Option<i32>,
    pub stages_deep_minutes: Option<i32>,
    pub stages_light_minutes: Option<i32>,
    pub stages_rem_minutes: Option<i32>,
    pub stages_wake_minutes: Option<i32>,
    pub is_main_sleep: Option<bool>,
    pub source: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateSleepParams {
    pub sleep_start: Option<DateTime<Utc>>,
    pub sleep_end: Option<DateTime<Utc>>,
    pub duration_minutes: Option<i32>,
    pub efficiency: Option<i32>,
}

impl Model {
    pub async fn find_by_user_and_date(
        db: &DatabaseConnection,
        user_id: i32,
        date: &chrono::NaiveDate,
    ) -> ModelResult<Vec<Self>> {
        let start = date
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_utc()
            .with_timezone(&chrono::FixedOffset::east_opt(0).unwrap());
        let end = (*date + chrono::Duration::days(1))
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_utc()
            .with_timezone(&chrono::FixedOffset::east_opt(0).unwrap());

        let records = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .filter(Column::SleepStart.gte(start))
            .filter(Column::SleepStart.lt(end))
            .order_by_asc(Column::SleepStart)
            .all(db)
            .await?;

        Ok(records)
    }

    pub async fn find_by_pid(
        db: &DatabaseConnection,
        pid: &Uuid,
    ) -> ModelResult<Self> {
        let record = Entity::find()
            .filter(Column::Pid.eq(*pid))
            .one(db)
            .await?
            .ok_or_else(|| ModelError::EntityNotFound)?;
        Ok(record)
    }

    pub async fn create(
        db: &DatabaseConnection,
        user_id: i32,
        params: &CreateSleepParams,
    ) -> ModelResult<Self> {
        let tz = chrono::FixedOffset::east_opt(0).unwrap();
        let record = ActiveModel {
            pid: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            fitbit_log_id: Set(None),
            sleep_start: Set(params.sleep_start.with_timezone(&tz)),
            sleep_end: Set(params.sleep_end.with_timezone(&tz)),
            duration_minutes: Set(params.duration_minutes),
            efficiency: Set(params.efficiency),
            stages_deep_minutes: Set(params.stages_deep_minutes),
            stages_light_minutes: Set(params.stages_light_minutes),
            stages_rem_minutes: Set(params.stages_rem_minutes),
            stages_wake_minutes: Set(params.stages_wake_minutes),
            is_main_sleep: Set(params.is_main_sleep.unwrap_or(true)),
            source: Set(params.source.clone().unwrap_or_else(|| "manual".to_string())),
            ..Default::default()
        };
        let record = record.insert(db).await?;
        Ok(record)
    }

    pub async fn delete(self, db: &DatabaseConnection) -> ModelResult<()> {
        let active: ActiveModel = self.into();
        active.delete(db).await?;
        Ok(())
    }
}
