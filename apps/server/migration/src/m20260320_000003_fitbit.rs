use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "fitbit_connections",
            &[
                ("id", ColType::PkAuto),
                ("user_id", ColType::Integer),
                ("fitbit_user_id", ColType::String),
                ("access_token_enc", ColType::Text),
                ("refresh_token_enc", ColType::Text),
                ("token_expires_at", ColType::TimestampWithTimeZoneNull),
                ("scope", ColType::StringNull),
                ("last_synced_at", ColType::TimestampWithTimeZoneNull),
            ],
            &[],
        )
        .await?;

        m.create_index(
            Index::create()
                .name("idx_fitbit_connections_user_id_uniq")
                .table(Alias::new("fitbit_connections"))
                .col(Alias::new("user_id"))
                .unique()
                .to_owned(),
        )
        .await?;

        create_table(
            m,
            "sleep_records",
            &[
                ("id", ColType::PkAuto),
                ("pid", ColType::Uuid),
                ("user_id", ColType::Integer),
                ("fitbit_log_id", ColType::BigIntegerNull),
                ("sleep_start", ColType::TimestampWithTimeZone),
                ("sleep_end", ColType::TimestampWithTimeZone),
                ("duration_minutes", ColType::Integer),
                ("efficiency", ColType::IntegerNull),
                ("stages_deep_minutes", ColType::IntegerNull),
                ("stages_light_minutes", ColType::IntegerNull),
                ("stages_rem_minutes", ColType::IntegerNull),
                ("stages_wake_minutes", ColType::IntegerNull),
                ("is_main_sleep", ColType::Boolean),
                ("source", ColType::String),
            ],
            &[],
        )
        .await?;

        m.create_index(
            Index::create()
                .name("idx_sleep_records_user_start")
                .table(Alias::new("sleep_records"))
                .col(Alias::new("user_id"))
                .col(Alias::new("sleep_start"))
                .to_owned(),
        )
        .await?;

        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "sleep_records").await?;
        drop_table(m, "fitbit_connections").await?;
        Ok(())
    }
}
