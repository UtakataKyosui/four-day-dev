pub use crate::models::_entities::meals::{self, ActiveModel, Column, Entity, Model};
use chrono::{DateTime, Utc};
use loco_rs::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateMealParams {
    pub meal_type: String,
    pub eaten_at: DateTime<Utc>,
    pub notes: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateMealParams {
    pub meal_type: Option<String>,
    pub eaten_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
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
        let end = date
            .and_hms_opt(23, 59, 59)
            .unwrap()
            .and_utc()
            .with_timezone(&chrono::FixedOffset::east_opt(0).unwrap());

        let meals = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .filter(Column::EatenAt.between(start, end))
            .order_by_asc(Column::EatenAt)
            .all(db)
            .await?;

        Ok(meals)
    }

    pub async fn find_by_pid(db: &DatabaseConnection, pid: &Uuid) -> ModelResult<Self> {
        let meal = Entity::find()
            .filter(Column::Pid.eq(*pid))
            .one(db)
            .await?
            .ok_or_else(|| ModelError::EntityNotFound)?;
        Ok(meal)
    }

    pub async fn create(
        db: &DatabaseConnection,
        user_id: i32,
        params: &CreateMealParams,
    ) -> ModelResult<Self> {
        let meal = ActiveModel {
            pid: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            meal_type: Set(params.meal_type.clone()),
            eaten_at: Set(params
                .eaten_at
                .with_timezone(&chrono::FixedOffset::east_opt(0).unwrap())),
            notes: Set(params.notes.clone()),
            ..Default::default()
        };
        let meal = meal.insert(db).await?;
        Ok(meal)
    }

    pub async fn update(
        self,
        db: &DatabaseConnection,
        params: &UpdateMealParams,
    ) -> ModelResult<Self> {
        let mut active: ActiveModel = self.into();
        if let Some(meal_type) = &params.meal_type {
            active.meal_type = Set(meal_type.clone());
        }
        if let Some(eaten_at) = params.eaten_at {
            active.eaten_at =
                Set(eaten_at.with_timezone(&chrono::FixedOffset::east_opt(0).unwrap()));
        }
        if let Some(notes) = &params.notes {
            active.notes = Set(notes.clone());
        }
        let meal = active.update(db).await?;
        Ok(meal)
    }

    pub async fn delete(self, db: &DatabaseConnection) -> ModelResult<()> {
        let active: ActiveModel = self.into();
        active.delete(db).await?;
        Ok(())
    }
}
