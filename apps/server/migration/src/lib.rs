#![allow(elided_lifetimes_in_paths)]
#![allow(clippy::wildcard_imports)]
pub use sea_orm_migration::prelude::*;
mod m20220101_000001_users;
mod m20260320_000002_meals;
mod m20260320_000003_fitbit;
mod m20260320_000004_analyses;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_users::Migration),
            Box::new(m20260320_000002_meals::Migration),
            Box::new(m20260320_000003_fitbit::Migration),
            Box::new(m20260320_000004_analyses::Migration),
            // inject-above (do not remove this comment)
        ]
    }
}
