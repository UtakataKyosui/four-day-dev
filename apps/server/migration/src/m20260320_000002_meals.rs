use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "meals",
            &[
                ("id", ColType::PkAuto),
                ("pid", ColType::Uuid),
                ("user_id", ColType::Integer),
                ("meal_type", ColType::String),
                ("eaten_at", ColType::TimestampWithTimeZone),
                ("notes", ColType::Text),
            ],
            &[],
        )
        .await?;

        m.create_index(
            Index::create()
                .name("idx_meals_user_eaten")
                .table(Alias::new("meals"))
                .col(Alias::new("user_id"))
                .col(Alias::new("eaten_at"))
                .to_owned(),
        )
        .await?;

        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "meals").await?;
        Ok(())
    }
}
