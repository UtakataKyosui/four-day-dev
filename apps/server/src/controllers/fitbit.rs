use crate::models::_entities::users;
use loco_rs::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct AuthUrlResponse {
    url: String,
}

#[derive(Serialize)]
struct FitbitStatusResponse {
    connected: bool,
    last_synced_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: String,
    #[allow(dead_code)]
    state: Option<String>,
}

fn get_fitbit_client_id() -> String {
    std::env::var("FITBIT_CLIENT_ID").unwrap_or_default()
}

fn get_fitbit_redirect_uri() -> String {
    std::env::var("FITBIT_REDIRECT_URI")
        .unwrap_or_else(|_| "http://localhost:5150/api/fitbit/callback".to_string())
}

fn get_frontend_url() -> String {
    std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string())
}

fn get_token_key() -> anyhow::Result<[u8; 32]> {
    let key_str = std::env::var("FITBIT_TOKEN_KEY")
        .unwrap_or_else(|_| "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".to_string());
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
    let key_bytes = BASE64
        .decode(&key_str)
        .map_err(|e| anyhow::anyhow!("invalid token key: {}", e))?;
    if key_bytes.len() != 32 {
        anyhow::bail!("FITBIT_TOKEN_KEY must be 32 bytes base64-encoded");
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&key_bytes);
    Ok(key)
}

#[debug_handler]
async fn auth_url(_auth: auth::JWT, State(_ctx): State<AppContext>) -> Result<Response> {
    let client_id = get_fitbit_client_id();
    let redirect_uri = get_fitbit_redirect_uri();
    let scope = "sleep";
    let url = format!(
        "https://www.fitbit.com/oauth2/authorize?response_type=code&client_id={}&redirect_uri={}&scope={}&expires_in=604800",
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(scope)
    );
    format::json(AuthUrlResponse { url })
}

#[debug_handler]
async fn callback(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Query(q): Query<CallbackQuery>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;

    let client_id = get_fitbit_client_id();
    let client_secret = std::env::var("FITBIT_CLIENT_SECRET").unwrap_or_default();
    let redirect_uri = get_fitbit_redirect_uri();

    // Exchange code for tokens
    let client = reqwest::Client::new();
    let token_response = client
        .post("https://api.fitbit.com/oauth2/token")
        .basic_auth(&client_id, Some(&client_secret))
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", &q.code),
            ("redirect_uri", &redirect_uri),
        ])
        .send()
        .await
        .map_err(|e| Error::Any(e.into()))?;

    if !token_response.status().is_success() {
        tracing::error!("Fitbit token exchange failed: {}", token_response.status());
        return Err(Error::BadRequest("Fitbit OAuth failed".to_string()));
    }

    let token_data: serde_json::Value = token_response
        .json()
        .await
        .map_err(|e| Error::Any(e.into()))?;

    let access_token = token_data["access_token"]
        .as_str()
        .ok_or_else(|| Error::BadRequest("no access_token".to_string()))?;
    let refresh_token = token_data["refresh_token"]
        .as_str()
        .ok_or_else(|| Error::BadRequest("no refresh_token".to_string()))?;
    let fitbit_user_id = token_data["user_id"]
        .as_str()
        .unwrap_or("unknown");
    let expires_in = token_data["expires_in"].as_i64().unwrap_or(28800);

    let token_expires_at = chrono::Utc::now() + chrono::Duration::seconds(expires_in);
    let key = get_token_key().map_err(|e| Error::Any(e.into()))?;

    crate::models::fitbit_connections::Model::upsert(
        &ctx.db,
        user.id,
        fitbit_user_id,
        access_token,
        refresh_token,
        Some(token_expires_at),
        token_data["scope"].as_str().map(|s| s.to_string()),
        &key,
    )
    .await?;

    let frontend_url = get_frontend_url();
    let redirect = format!("{}/settings?fitbit=connected", frontend_url);

    // Return redirect response
    use axum::response::Redirect;
    Ok(Redirect::to(&redirect).into_response())
}

#[debug_handler]
async fn status(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    let conn = crate::models::fitbit_connections::Model::find_by_user_id(&ctx.db, user.id).await?;

    let response = if let Some(conn) = conn {
        FitbitStatusResponse {
            connected: true,
            last_synced_at: conn.last_synced_at.map(|t| t.into()),
        }
    } else {
        FitbitStatusResponse {
            connected: false,
            last_synced_at: None,
        }
    };

    format::json(response)
}

#[debug_handler]
async fn disconnect(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;
    crate::models::fitbit_connections::Model::delete_by_user_id(&ctx.db, user.id).await?;
    format::json(())
}

#[derive(Deserialize)]
struct SyncParams {
    date: Option<String>,
}

#[debug_handler]
async fn sync(
    auth: auth::JWT,
    State(ctx): State<AppContext>,
    Json(params): Json<SyncParams>,
) -> Result<Response> {
    let user = users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await?;

    let conn = crate::models::fitbit_connections::Model::find_by_user_id(&ctx.db, user.id)
        .await?
        .ok_or_else(|| Error::BadRequest("Fitbit not connected".to_string()))?;

    let date = params.date.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    use crate::workers::fitbit_sync::{FitbitSyncWorker, FitbitSyncArgs};
    FitbitSyncWorker::perform_later(
        &ctx,
        FitbitSyncArgs {
            user_id: user.id,
            fitbit_connection_id: conn.id,
            date,
        },
    )
    .await?;

    format::json(serde_json::json!({ "status": "queued" }))
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/fitbit")
        .add("/auth-url", get(auth_url))
        .add("/callback", get(callback))
        .add("/status", get(status))
        .add("/connection", delete(disconnect))
        .add("/sync", post(sync))
}
