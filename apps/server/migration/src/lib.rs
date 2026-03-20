<<<<<<< conflict 1 of 1
+++++++ yynstptl 45761590 "feat: 環境構築セットアップ" (rebase destination)
%%%%%%% diff from: tknntulk 8551e779 "chore: Statuslineを設定" (parents of rebased revision)
\\\\\\\        to: pysuokvu 04df1547 (rebased revision)
 #![allow(elided_lifetimes_in_paths)]
 #![allow(clippy::wildcard_imports)]
 pub use sea_orm_migration::prelude::*;
 mod m20220101_000001_users;
+mod m20260320_000002_meals;
+mod m20260320_000003_fitbit;
+mod m20260320_000004_analyses;
 
 pub struct Migrator;
 
 #[async_trait::async_trait]
 impl MigratorTrait for Migrator {
     fn migrations() -> Vec<Box<dyn MigrationTrait>> {
         vec![
             Box::new(m20220101_000001_users::Migration),
+            Box::new(m20260320_000002_meals::Migration),
+            Box::new(m20260320_000003_fitbit::Migration),
+            Box::new(m20260320_000004_analyses::Migration),
             // inject-above (do not remove this comment)
         ]
     }
 }
>>>>>>> conflict 1 of 1 ends
