pub use crate::models::_entities::fitbit_connections::{self, ActiveModel, Column, Entity, Model};
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::{DateTime, Utc};
use loco_rs::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

impl Model {
    pub async fn find_by_user_id(
        db: &DatabaseConnection,
        user_id: i32,
    ) -> ModelResult<Option<Self>> {
        let conn = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .one(db)
            .await?;
        Ok(conn)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn upsert(
        db: &DatabaseConnection,
        user_id: i32,
        fitbit_user_id: &str,
        access_token: &str,
        refresh_token: &str,
        token_expires_at: Option<DateTime<Utc>>,
        scope: Option<String>,
        encryption_key: &[u8; 32],
    ) -> ModelResult<Self> {
        let access_token_enc = Self::encrypt_token(access_token, encryption_key)
            .map_err(|e| ModelError::Any(e.into()))?;
        let refresh_token_enc = Self::encrypt_token(refresh_token, encryption_key)
            .map_err(|e| ModelError::Any(e.into()))?;
        let tz = chrono::FixedOffset::east_opt(0).unwrap();

        let existing = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .one(db)
            .await?;

        let conn = if let Some(existing) = existing {
            let mut active: ActiveModel = existing.into();
            active.fitbit_user_id = Set(fitbit_user_id.to_string());
            active.access_token_enc = Set(access_token_enc);
            active.refresh_token_enc = Set(refresh_token_enc);
            active.token_expires_at = Set(token_expires_at.map(|t| t.with_timezone(&tz)));
            active.scope = Set(scope);
            active.update(db).await?
        } else {
            let active = ActiveModel {
                user_id: Set(user_id),
                fitbit_user_id: Set(fitbit_user_id.to_string()),
                access_token_enc: Set(access_token_enc),
                refresh_token_enc: Set(refresh_token_enc),
                token_expires_at: Set(token_expires_at.map(|t| t.with_timezone(&tz))),
                scope: Set(scope),
                ..Default::default()
            };
            active.insert(db).await?
        };

        Ok(conn)
    }

    pub async fn delete_by_user_id(db: &DatabaseConnection, user_id: i32) -> ModelResult<()> {
        Entity::delete_many()
            .filter(Column::UserId.eq(user_id))
            .exec(db)
            .await?;
        Ok(())
    }

    pub async fn update_last_synced(self, db: &DatabaseConnection) -> ModelResult<Self> {
        let tz = chrono::FixedOffset::east_opt(0).unwrap();
        let mut active: ActiveModel = self.into();
        active.last_synced_at = Set(Some(Utc::now().with_timezone(&tz)));
        let conn = active.update(db).await?;
        Ok(conn)
    }

    pub fn decrypt_access_token(&self, key: &[u8; 32]) -> Result<String> {
        Self::decrypt_token(&self.access_token_enc, key).map_err(|e| loco_rs::Error::Any(e.into()))
    }

    pub fn decrypt_refresh_token(&self, key: &[u8; 32]) -> Result<String> {
        Self::decrypt_token(&self.refresh_token_enc, key).map_err(|e| loco_rs::Error::Any(e.into()))
    }

    fn encrypt_token(token: &str, key: &[u8; 32]) -> anyhow::Result<String> {
        let cipher = Aes256Gcm::new(key.into());
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher
            .encrypt(&nonce, token.as_bytes())
            .map_err(|e| anyhow::anyhow!("encryption error: {}", e))?;

        let mut combined = nonce.to_vec();
        combined.extend_from_slice(&ciphertext);
        Ok(BASE64.encode(&combined))
    }

    fn decrypt_token(encrypted: &str, key: &[u8; 32]) -> anyhow::Result<String> {
        let combined = BASE64
            .decode(encrypted)
            .map_err(|e| anyhow::anyhow!("base64 decode error: {}", e))?;

        if combined.len() < 12 {
            anyhow::bail!("invalid ciphertext");
        }

        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let nonce = aes_gcm::Nonce::from_slice(nonce_bytes);
        let cipher = Aes256Gcm::new(key.into());

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| anyhow::anyhow!("decryption error: {}", e))?;

        String::from_utf8(plaintext).map_err(|e| anyhow::anyhow!("utf8 error: {}", e))
    }
}
