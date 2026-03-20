<<<<<<< conflict 1 of 1
+++++++ yynstptl 45761590 "feat: 環境構築セットアップ" (rebase destination)
%%%%%%% diff from: tknntulk 8551e779 "chore: Statuslineを設定" (parents of rebased revision)
\\\\\\\        to: pysuokvu 04df1547 (rebased revision)
 use async_trait::async_trait;
 use loco_rs::{
     app::{AppContext, Hooks, Initializer},
     bgworker::{BackgroundWorker, Queue},
     boot::{create_app, BootResult, StartMode},
     config::Config,
     controller::AppRoutes,
     db::{self, truncate_table},
     environment::Environment,
     task::Tasks,
     Result,
 };
 use migration::Migrator;
 use std::path::Path;
 
 #[allow(unused_imports)]
-use crate::{controllers, models::_entities::users, tasks, workers::downloader::DownloadWorker};
+use crate::{
+    controllers,
+    models::_entities::users,
+    tasks,
+    workers::{
+        downloader::DownloadWorker,
+        fitbit_sync::FitbitSyncWorker,
+        health_analysis::HealthAnalysisWorker,
+    },
+};
 
 pub struct App;
 #[async_trait]
 impl Hooks for App {
     fn app_name() -> &'static str {
         env!("CARGO_CRATE_NAME")
     }
 
     fn app_version() -> String {
         format!(
             "{} ({})",
             env!("CARGO_PKG_VERSION"),
             option_env!("BUILD_SHA")
                 .or(option_env!("GITHUB_SHA"))
                 .unwrap_or("dev")
         )
     }
 
     async fn boot(
         mode: StartMode,
         environment: &Environment,
         config: Config,
     ) -> Result<BootResult> {
         create_app::<Self, Migrator>(mode, environment, config).await
     }
 
     async fn initializers(_ctx: &AppContext) -> Result<Vec<Box<dyn Initializer>>> {
         Ok(vec![])
     }
 
     fn routes(_ctx: &AppContext) -> AppRoutes {
-        AppRoutes::with_default_routes() // controller routes below
+        AppRoutes::with_default_routes()
             .add_route(controllers::auth::routes())
+            .add_route(controllers::meals::routes())
+            .add_route(controllers::sleep::routes())
+            .add_route(controllers::fitbit::routes())
+            .add_route(controllers::analysis::routes())
     }
+
     async fn connect_workers(ctx: &AppContext, queue: &Queue) -> Result<()> {
         queue.register(DownloadWorker::build(ctx)).await?;
+        queue.register(FitbitSyncWorker::build(ctx)).await?;
+        queue.register(HealthAnalysisWorker::build(ctx)).await?;
         Ok(())
     }
 
     #[allow(unused_variables)]
     fn register_tasks(tasks: &mut Tasks) {
         // tasks-inject (do not remove)
     }
+
     async fn truncate(ctx: &AppContext) -> Result<()> {
         truncate_table(&ctx.db, users::Entity).await?;
         Ok(())
     }
+
     async fn seed(ctx: &AppContext, base: &Path) -> Result<()> {
-        db::seed::<users::ActiveModel>(&ctx.db, &base.join("users.yaml").display().to_string())
-            .await?;
+        db::seed::<users::ActiveModel>(
+            &ctx.db,
+            &base.join("users.yaml").display().to_string(),
+        )
+        .await?;
         Ok(())
     }
 }
>>>>>>> conflict 1 of 1 ends
