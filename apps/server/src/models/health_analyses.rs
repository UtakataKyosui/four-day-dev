pub use crate::models::_entities::health_analyses::{self, ActiveModel, Column, Entity, Model};
use chrono::NaiveDate;
use loco_rs::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, serde::Serialize)]
pub struct AnalysisStatus {
    pub status: String,
    pub analysis_pid: Option<String>,
}

impl Model {
    pub async fn find_by_pid(db: &DatabaseConnection, pid: &Uuid) -> ModelResult<Self> {
        let analysis = Entity::find()
            .filter(Column::Pid.eq(*pid))
            .one(db)
            .await?
            .ok_or_else(|| ModelError::EntityNotFound)?;
        Ok(analysis)
    }

    pub async fn find_by_user_and_date(
        db: &DatabaseConnection,
        user_id: i32,
        date: &NaiveDate,
    ) -> ModelResult<Option<Self>> {
        let analysis = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .filter(Column::AnalysisDate.eq(*date))
            .one(db)
            .await?;
        Ok(analysis)
    }

    pub async fn find_history(
        db: &DatabaseConnection,
        user_id: i32,
        from: &NaiveDate,
        to: &NaiveDate,
    ) -> ModelResult<Vec<Self>> {
        let analyses = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .filter(Column::AnalysisDate.between(*from, *to))
            .order_by_desc(Column::AnalysisDate)
            .all(db)
            .await?;
        Ok(analyses)
    }

    pub async fn count_today_for_user(
        db: &DatabaseConnection,
        user_id: i32,
        date: &NaiveDate,
    ) -> ModelResult<u64> {
        use sea_orm::PaginatorTrait;
        let count = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .filter(Column::AnalysisDate.eq(*date))
            .count(db)
            .await?;
        Ok(count)
    }

    pub async fn create_pending(
        db: &DatabaseConnection,
        user_id: i32,
        date: &NaiveDate,
    ) -> ModelResult<Self> {
        let analysis = ActiveModel {
            pid: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            analysis_date: Set(*date),
            status: Set("pending".to_string()),
            ..Default::default()
        };
        let analysis = analysis.insert(db).await?;
        Ok(analysis)
    }

    pub async fn mark_processing(self, db: &DatabaseConnection) -> ModelResult<Self> {
        let mut active: ActiveModel = self.into();
        active.status = Set("processing".to_string());
        let analysis = active.update(db).await?;
        Ok(analysis)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn complete(
        self,
        db: &DatabaseConnection,
        meal_score: i32,
        sleep_score: i32,
        overall_score: i32,
        summary: String,
        recommendations: Value,
        input_snapshot: Value,
        model_used: String,
        prompt_tokens: i32,
        completion_tokens: i32,
    ) -> ModelResult<Self> {
        let mut active: ActiveModel = self.into();
        active.status = Set("completed".to_string());
        active.meal_score = Set(Some(meal_score));
        active.sleep_score = Set(Some(sleep_score));
        active.overall_score = Set(Some(overall_score));
        active.summary = Set(Some(summary));
        active.recommendations = Set(Some(recommendations));
        active.input_snapshot = Set(Some(input_snapshot));
        active.model_used = Set(Some(model_used));
        active.prompt_tokens = Set(Some(prompt_tokens));
        active.completion_tokens = Set(Some(completion_tokens));
        let analysis = active.update(db).await?;
        Ok(analysis)
    }

    pub async fn mark_failed(self, db: &DatabaseConnection, reason: &str) -> ModelResult<Self> {
        let mut active: ActiveModel = self.into();
        active.status = Set("failed".to_string());
        active.summary = Set(Some(format!("Analysis failed: {}", reason)));
        let analysis = active.update(db).await?;
        Ok(analysis)
    }
}
