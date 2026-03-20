use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "health_analyses",
            &[
                ("id", ColType::PkAuto),
                ("pid", ColType::Uuid),
                ("user_id", ColType::Integer),
                ("analysis_date", ColType::Date),
                ("status", ColType::String),
                ("meal_score", ColType::IntegerNull),
                ("sleep_score", ColType::IntegerNull),
                ("overall_score", ColType::IntegerNull),
                ("summary", ColType::TextNull),
                ("recommendations", ColType::JsonBinaryNull),
                ("input_snapshot", ColType::JsonBinaryNull),
                ("model_used", ColType::StringNull),
                ("prompt_tokens", ColType::IntegerNull),
                ("completion_tokens", ColType::IntegerNull),
            ],
            &[],
        )
        .await?;

        m.create_index(
            Index::create()
                .name("idx_health_analyses_user_date")
                .table(Alias::new("health_analyses"))
                .col(Alias::new("user_id"))
                .col(Alias::new("analysis_date"))
                .to_owned(),
        )
        .await?;

        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "health_analyses").await?;
        Ok(())
    }
}
