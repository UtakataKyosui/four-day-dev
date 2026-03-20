import type { Page } from "@playwright/test";
import { TEST_TOKEN } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5150";

// ---- モックデータファクトリ ----

export const mockData = {
  meal: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    pid: "meal-pid-1",
    meal_type: "breakfast",
    eaten_at: "2026-03-20T07:00:00.000Z",
    notes: "テスト朝食データ",
    created_at: "2026-03-20T07:00:00.000Z",
    ...overrides,
  }),

  sleepRecord: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    pid: "sleep-pid-1",
    sleep_start: "2026-03-19T23:00:00.000Z",
    sleep_end: "2026-03-20T07:00:00.000Z",
    duration_minutes: 480,
    efficiency: 85,
    stages_deep_minutes: 90,
    stages_light_minutes: 200,
    stages_rem_minutes: 120,
    stages_wake_minutes: 70,
    is_main_sleep: true,
    source: "manual",
    created_at: "2026-03-20T08:00:00.000Z",
    ...overrides,
  }),

  analysis: (overrides: Record<string, unknown> = {}) => ({
    pid: "analysis-pid-1",
    analysis_date: "2026-03-20",
    status: "completed",
    meal_score: 75,
    sleep_score: 80,
    overall_score: 78,
    summary: "バランスの良い食事と十分な睡眠が取れています。",
    recommendations: [
      { category: "meal", text: "タンパク質をもう少し増やしてみましょう", priority: "medium" },
      { category: "sleep", text: "就寝時間を一定に保つことをお勧めします", priority: "low" },
    ],
    created_at: "2026-03-20T09:00:00.000Z",
    ...overrides,
  }),
};

// ---- 認証モック ----

export async function mockLoginSuccess(page: Page): Promise<void> {
  await page.route(`${API_BASE}/api/auth/login`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: TEST_TOKEN,
        name: "テストユーザー",
        email: "test@example.com",
      }),
    });
  });
}

export async function mockLoginFailure(page: Page): Promise<void> {
  await page.route(`${API_BASE}/api/auth/login`, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "メールアドレスまたはパスワードが正しくありません" }),
    });
  });
}

// ---- 食事モック ----

export async function mockMeals(page: Page, meals: unknown[] = []): Promise<void> {
  await page.route(`${API_BASE}/api/meals**`, async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          mockData.meal({
            pid: "meal-pid-new",
            meal_type: body.meal_type,
            notes: body.notes,
            eaten_at: body.eaten_at,
          })
        ),
      });
    } else if (method === "PUT") {
      const body = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockData.meal({ pid: "meal-pid-1", ...body })),
      });
    } else if (method === "DELETE") {
      await route.fulfill({ status: 204 });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(meals),
      });
    }
  });
}

// ---- 睡眠モック ----

export async function mockSleep(
  page: Page,
  records: unknown[] = [],
  fitbitConnected = false
): Promise<void> {
  await page.route(`${API_BASE}/api/fitbit/status`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: fitbitConnected, last_synced_at: null }),
    });
  });

  await page.route(`${API_BASE}/api/sleep**`, async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          mockData.sleepRecord({ pid: "sleep-pid-new", source: "manual", ...body })
        ),
      });
    } else if (method === "DELETE") {
      await route.fulfill({ status: 204 });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(records),
      });
    }
  });
}

// ---- 分析モック ----
// 注意: 特定ルートを汎用ルートより先に登録する

export async function mockAnalysis(
  page: Page,
  analysis: unknown | null = null,
  history: unknown[] = []
): Promise<void> {
  await page.route(`${API_BASE}/api/analysis/trigger`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ job_id: "test-job-id", status: "pending" }),
    });
  });

  await page.route(`${API_BASE}/api/analysis/status/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "completed", analysis_pid: "analysis-pid-1" }),
    });
  });

  await page.route(`${API_BASE}/api/analysis/history**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(history),
    });
  });

  await page.route(`${API_BASE}/api/analysis**`, async (route) => {
    if (analysis === null) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Not found" }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(analysis),
      });
    }
  });
}

// ---- まとめてデフォルトモック ----

export async function setupDefaultMocks(page: Page): Promise<void> {
  await mockMeals(page, []);
  await mockSleep(page, [], false);
  await mockAnalysis(page, null, []);
}
