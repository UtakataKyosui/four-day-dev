use crate::models::{
    _entities::users,
    meals::{CreateMealParams, UpdateMealParams},
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
            .map_err(|_| Error::BadRequest("invalid date format, use YYYY-MM-DD".to_string()))?
    } else {
        chrono::Utc::now().date_naive()
    };

    let meals = crate::models::meals::Model::find_by_user_and_date(&ctx.db, user.id, &date).await?;

    format::json(meals)
}

#[debug_handler]
async fn create(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Json(params): Json<CreateMealParams>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;

    if params.meal_type != "breakfast"
        && params.meal_type != "lunch"
        && params.meal_type != "dinner"
    {
        return Err(Error::BadRequest(
            "meal_type must be breakfast, lunch, or dinner".to_string(),
        ));
    }

    let meal = crate::models::meals::Model::create(&ctx.db, user.id, &params).await?;
    format::json(meal)
}

#[debug_handler]
async fn get_one(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Path(pid): Path<Uuid>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let meal = crate::models::meals::Model::find_by_pid(&ctx.db, &pid).await?;

    if meal.user_id != user.id {
        return unauthorized("unauthorized");
    }

    format::json(meal)
}

#[debug_handler]
async fn update(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Path(pid): Path<Uuid>,
    Json(params): Json<UpdateMealParams>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let meal = crate::models::meals::Model::find_by_pid(&ctx.db, &pid).await?;

    if meal.user_id != user.id {
        return unauthorized("unauthorized");
    }

    let updated = meal.update(&ctx.db, &params).await?;
    format::json(updated)
}

#[debug_handler]
async fn delete_one(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Path(pid): Path<Uuid>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let meal = crate::models::meals::Model::find_by_pid(&ctx.db, &pid).await?;

    if meal.user_id != user.id {
        return unauthorized("unauthorized");
    }

    meal.delete(&ctx.db).await?;
    format::json(())
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/meals")
        .add("/", get(list))
        .add("/", post(create))
        .add("/{pid}", get(get_one))
        .add("/{pid}", put(update))
        .add("/{pid}", delete(delete_one))
}
