use loco_rs::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub struct HealthAnalysisWorker {
    pub ctx: AppContext,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct HealthAnalysisArgs {
    pub analysis_pid: String,
    pub user_id: i32,
    pub date: String,
}

#[derive(Deserialize, Debug)]
struct AgentAnalysisResponse {
    meal_score: i32,
    sleep_score: i32,
    overall_score: i32,
    summary: String,
    recommendations: serde_json::Value,
    usage: Option<serde_json::Value>,
}

#[async_trait]
impl BackgroundWorker<HealthAnalysisArgs> for HealthAnalysisWorker {
    fn build(ctx: &AppContext) -> Self {
        Self { ctx: ctx.clone() }
    }

    async fn perform(&self, args: HealthAnalysisArgs) -> Result<()> {
        let pid: Uuid = args
            .analysis_pid
            .parse()
            .map_err(|_| Error::BadRequest("invalid analysis pid".to_string()))?;

        let analysis =
            crate::models::health_analyses::Model::find_by_pid(&self.ctx.db, &pid).await?;

        let analysis = analysis.mark_processing(&self.ctx.db).await?;

        let date = chrono::NaiveDate::parse_from_str(&args.date, "%Y-%m-%d")
            .map_err(|_| Error::BadRequest("invalid date".to_string()))?;

        // Fetch meals for the date
        let meals = crate::models::meals::Model::find_by_user_and_date(
            &self.ctx.db,
            args.user_id,
            &date,
        )
        .await?;

        // Fetch sleep for the date
        let sleep_records = crate::models::sleep_records::Model::find_by_user_and_date(
            &self.ctx.db,
            args.user_id,
            &date,
        )
        .await?;

        let main_sleep = sleep_records
            .iter()
            .find(|s| s.is_main_sleep)
            .or_else(|| sleep_records.first());

        // Build payload for Agent Service
        let meals_payload: Vec<serde_json::Value> = meals
            .iter()
            .map(|m| {
                serde_json::json!({
                    "meal_type": m.meal_type,
                    "eaten_at": m.eaten_at.to_rfc3339(),
                    "notes": m.notes,
                })
            })
            .collect();

        let sleep_payload = main_sleep.map(|s| {
            serde_json::json!({
                "duration_minutes": s.duration_minutes,
                "efficiency": s.efficiency,
                "stages_deep_minutes": s.stages_deep_minutes,
                "stages_light_minutes": s.stages_light_minutes,
                "stages_rem_minutes": s.stages_rem_minutes,
                "stages_wake_minutes": s.stages_wake_minutes,
            })
        });

        let input_snapshot = serde_json::json!({
            "date": args.date,
            "meals": meals_payload,
            "sleep": sleep_payload,
        });

        let agent_url = std::env::var("AGENT_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8081".to_string());

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/analyze", agent_url))
            .json(&serde_json::json!({
                "date": args.date,
                "meals": input_snapshot["meals"],
                "sleep": input_snapshot["sleep"],
            }))
            .timeout(std::time::Duration::from_secs(120))
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                let agent_result: AgentAnalysisResponse =
                    resp.json().await.map_err(|e| Error::Any(e.into()))?;

                let usage = agent_result.usage.unwrap_or_default();
                let prompt_tokens = usage["prompt_tokens"].as_i64().unwrap_or(0) as i32;
                let completion_tokens =
                    usage["completion_tokens"].as_i64().unwrap_or(0) as i32;

                analysis
                    .complete(
                        &self.ctx.db,
                        agent_result.meal_score,
                        agent_result.sleep_score,
                        agent_result.overall_score,
                        agent_result.summary,
                        agent_result.recommendations,
                        input_snapshot,
                        "claude-haiku-4-5".to_string(),
                        prompt_tokens,
                        completion_tokens,
                    )
                    .await?;
            }
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                tracing::error!("Agent service failed: {} - {}", status, body);
                analysis
                    .mark_failed(&self.ctx.db, &format!("Agent service error: {}", status))
                    .await?;
            }
            Err(e) => {
                tracing::error!("Agent service request error: {}", e);
                analysis
                    .mark_failed(&self.ctx.db, &e.to_string())
                    .await?;
            }
        }

        Ok(())
    }
}
