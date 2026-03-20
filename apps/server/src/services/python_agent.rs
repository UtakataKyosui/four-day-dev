use anyhow::{Context, Result};
use pyo3::{prelude::*, types::PyList};
use serde::{Deserialize, Serialize};

const PYTHON_AGENT_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../packages/agent");

#[derive(Debug, Serialize)]
pub struct HealthAgentRequest {
    pub date: String,
    pub meals: Vec<serde_json::Value>,
    pub sleep: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct HealthAgentResponse {
    pub meal_score: i32,
    pub sleep_score: i32,
    pub overall_score: i32,
    pub summary: String,
    pub recommendations: serde_json::Value,
    pub usage: Option<serde_json::Value>,
}

pub async fn analyze_health(request: HealthAgentRequest) -> Result<HealthAgentResponse> {
    tokio::task::spawn_blocking(move || analyze_health_blocking(request))
        .await
        .context("python agent task join failed")?
}

fn analyze_health_blocking(request: HealthAgentRequest) -> Result<HealthAgentResponse> {
    Python::with_gil(|py| {
        let sys = py.import_bound("sys").context("failed to import sys")?;
        let path = sys
            .getattr("path")
            .context("failed to access sys.path")?
            .downcast_into::<PyList>()
            .map_err(|_| anyhow::anyhow!("failed to downcast sys.path"))?;

        path.insert(0, PYTHON_AGENT_DIR)
            .context("failed to extend sys.path")?;

        let module = py
            .import_bound("health_agent")
            .context("failed to import python health_agent module")?;
        let payload = serde_json::to_string(&request).context("failed to serialize request")?;
        let raw_response: String = module
            .getattr("run_health_analysis")
            .context("missing run_health_analysis function")?
            .call1((payload,))
            .context("python agent execution failed")?
            .extract()
            .context("failed to extract python agent response")?;

        serde_json::from_str(&raw_response).context("failed to parse python agent response")
    })
}
