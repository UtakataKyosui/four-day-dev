use crate::models::_entities::users;
use axum::extract::{Path, Query};
use loco_rs::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
struct DateQuery {
    date: Option<String>,
}

#[derive(Deserialize)]
struct HistoryQuery {
    from: Option<String>,
    to: Option<String>,
}

#[derive(Serialize)]
struct TriggerResponse {
    job_id: String,
    status: String,
}

#[derive(Serialize)]
struct StatusResponse {
    status: String,
    analysis_pid: Option<String>,
}

#[debug_handler]
async fn trigger(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Json(params): Json<Option<DateQuery>>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;

    let date_str = params
        .and_then(|p| p.date)
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    let date = chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
        .map_err(|_| Error::BadRequest("invalid date format".to_string()))?;

    // Rate limit: max 3 analyses per user per day
    let count =
        crate::models::health_analyses::Model::count_today_for_user(&ctx.db, user.id, &date)
            .await?;

    if count >= 3 {
        return Err(Error::BadRequest(
            "Analysis limit reached (3 per day)".to_string(),
        ));
    }

    let analysis =
        crate::models::health_analyses::Model::create_pending(&ctx.db, user.id, &date).await?;

    use crate::workers::health_analysis::{HealthAnalysisArgs, HealthAnalysisWorker};
    HealthAnalysisWorker::perform_later(
        &ctx,
        HealthAnalysisArgs {
            analysis_pid: analysis.pid.to_string(),
            user_id: user.id,
            date: date_str,
        },
    )
    .await?;

    format::json(TriggerResponse {
        job_id: analysis.pid.to_string(),
        status: "pending".to_string(),
    })
}

#[debug_handler]
async fn get_status(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Path(job_id): Path<Uuid>,
) -> Result<Response> {
    let _user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let analysis = crate::models::health_analyses::Model::find_by_pid(&ctx.db, &job_id).await?;

    format::json(StatusResponse {
        status: analysis.status.clone(),
        analysis_pid: if analysis.status == "completed" {
            Some(analysis.pid.to_string())
        } else {
            None
        },
    })
}

#[debug_handler]
async fn get_analysis(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Query(q): Query<DateQuery>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;

    let date = if let Some(date_str) = q.date {
        chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
            .map_err(|_| Error::BadRequest("invalid date format".to_string()))?
    } else {
        chrono::Utc::now().date_naive()
    };

    let analysis =
        crate::models::health_analyses::Model::find_by_user_and_date(&ctx.db, user.id, &date)
            .await?;

    format::json(analysis)
}

#[debug_handler]
async fn get_history(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Query(q): Query<HistoryQuery>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;

    let to = chrono::Utc::now().date_naive();
    let from = to - chrono::Duration::days(30);

    let from_date = if let Some(s) = q.from {
        chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d")
            .map_err(|_| Error::BadRequest("invalid from date".to_string()))?
    } else {
        from
    };

    let to_date = if let Some(s) = q.to {
        chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d")
            .map_err(|_| Error::BadRequest("invalid to date".to_string()))?
    } else {
        to
    };

    let analyses =
        crate::models::health_analyses::Model::find_history(&ctx.db, user.id, &from_date, &to_date)
            .await?;

    format::json(analyses)
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/analysis")
        .add("/trigger", post(trigger))
        .add("/status/{job_id}", get(get_status))
        .add("/", get(get_analysis))
        .add("/history", get(get_history))
}
