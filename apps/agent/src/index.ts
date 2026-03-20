import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { analyzeHealth } from "./skill.js";
import type { AnalyzeRequest } from "./types.js";

const app = new Hono();

app.use("*", logger());

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "agent" });
});

app.post("/analyze", async (c) => {
  let body: AnalyzeRequest;
  try {
    body = await c.req.json<AnalyzeRequest>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.date) {
    return c.json({ error: "date is required" }, 400);
  }

  if (!Array.isArray(body.meals)) {
    body.meals = [];
  }

  try {
    const result = await analyzeHealth(body);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("Analysis error:", err);
    return c.json({ error: message }, 500);
  }
});

const port = Number.parseInt(process.env.PORT || "8081", 10);

console.log(`Agent service starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
