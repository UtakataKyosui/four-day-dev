use crate::models::{
    _entities::users,
    sleep_records::CreateSleepParams,
};
use axum::extract::{Path, Query};
use loco_rs::prelude::*;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
struct DateQuery {
    date: Option<String>,
}

#[debug_handler]
async fn list(
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

    let records =
        crate::models::sleep_records::Model::find_by_user_and_date(&ctx.db, user.id, &date).await?;

    format::json(records)
}

#[debug_handler]
async fn create(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Json(params): Json<CreateSleepParams>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let record = crate::models::sleep_records::Model::create(&ctx.db, user.id, &params).await?;
    format::json(record)
}

#[debug_handler]
async fn update(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Path(pid): Path<Uuid>,
    Json(params): Json<crate::models::sleep_records::UpdateSleepParams>,
) -> Result<Response> {
    use sea_orm::{ActiveModelTrait, Set};
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let record = crate::models::sleep_records::Model::find_by_pid(&ctx.db, &pid).await?;

    if record.user_id != user.id {
        return unauthorized("unauthorized");
    }

    let tz = chrono::FixedOffset::east_opt(0).unwrap();
    let mut active: crate::models::_entities::sleep_records::ActiveModel = record.into();
    if let Some(start) = params.sleep_start {
        active.sleep_start = Set(start.with_timezone(&tz));
    }
    if let Some(end) = params.sleep_end {
        active.sleep_end = Set(end.with_timezone(&tz));
    }
    if let Some(dur) = params.duration_minutes {
        active.duration_minutes = Set(dur);
    }
    if let Some(eff) = params.efficiency {
        active.efficiency = Set(Some(eff));
    }
    let updated = active.update(&ctx.db).await?;
    format::json(updated)
}

#[debug_handler]
async fn delete_one(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Path(pid): Path<Uuid>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let record = crate::models::sleep_records::Model::find_by_pid(&ctx.db, &pid).await?;

    if record.user_id != user.id {
        return unauthorized("unauthorized");
    }

    record.delete(&ctx.db).await?;
    format::json(())
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/sleep")
        .add("/", get(list))
        .add("/", post(create))
        .add("/{pid}", put(update))
        .add("/{pid}", delete(delete_one))
}
