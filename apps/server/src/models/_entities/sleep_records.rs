//! `SeaORM` Entity for sleep_records table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "sleep_records")]
pub struct Model {
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
    #[sea_orm(primary_key)]
    pub id: i32,
    pub pid: Uuid,
    pub user_id: i32,
    pub fitbit_log_id: Option<i64>,
    pub sleep_start: DateTimeWithTimeZone,
    pub sleep_end: DateTimeWithTimeZone,
    pub duration_minutes: i32,
    pub efficiency: Option<i32>,
    pub stages_deep_minutes: Option<i32>,
    pub stages_light_minutes: Option<i32>,
    pub stages_rem_minutes: Option<i32>,
    pub stages_wake_minutes: Option<i32>,
    pub is_main_sleep: bool,
    pub source: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UserId",
        to = "super::users::Column::Id"
    )]
    Users,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Users.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
