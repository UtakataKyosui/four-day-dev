import { expect, test } from "@playwright/test";
import { setLoggedIn } from "./helpers/auth";
import { mockAnalysis, mockData, mockMeals, mockSleep } from "./helpers/mocks";

test.describe("健康分析", () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page);
    await mockMeals(page, []);
    await mockSleep(page, [], false);
  });

  test("完了済みの分析カードが表示される", async ({ page }) => {
    await mockAnalysis(page, mockData.analysis());
    await page.goto("/analysis");

    await expect(page.getByText("健康分析")).toBeVisible();
    // スコアが表示される
    await expect(page.getByText("78", { exact: true })).toBeVisible(); // overall_score
    await expect(page.getByText("75", { exact: true })).toBeVisible(); // meal_score
    await expect(page.getByText("80", { exact: true })).toBeVisible(); // sleep_score
  });

  test("分析トリガーボタンが動作し、ポーリング後に完了状態になる", async ({ page }) => {
    // 最初はデータなし → 分析トリガー → completed を即返す
    await mockAnalysis(page, null, []);
    await page.goto("/analysis");

    await expect(page.getByRole("button", { name: "🤖 AIで健康分析する" })).toBeVisible();

    // トリガーボタンをクリック
    await page.getByRole("button", { name: "🤖 AIで健康分析する" }).click();

    // ステータスメッセージが表示される
    await expect(page.getByText("分析を開始しています...")).toBeVisible();

    // ポーリング完了後に「完了」が表示される（status エンドポイントが completed を返す）
    await expect(page.getByText("完了")).toBeVisible({ timeout: 10_000 });
  });

  test("スコア・推薦事項が表示される", async ({ page }) => {
    const analysisWithRecs = mockData.analysis({
      overall_score: 78,
      meal_score: 75,
      sleep_score: 80,
      summary: "テスト用分析サマリーです。",
      recommendations: [
        { category: "meal", text: "タンパク質を増やしましょう", priority: "medium" },
        { category: "sleep", text: "就寝時間を一定に", priority: "low" },
      ],
    });
    await mockAnalysis(page, analysisWithRecs);
    await page.goto("/analysis");

    await expect(page.getByText("分析サマリー")).toBeVisible();
    await expect(page.getByText("テスト用分析サマリーです。")).toBeVisible();
    await expect(page.getByText("タンパク質を増やしましょう")).toBeVisible();
    await expect(page.getByText("就寝時間を一定に")).toBeVisible();
  });

  test("分析履歴ページが表示される", async ({ page }) => {
    const historyItems = [
      mockData.analysis({
        pid: "analysis-hist-1",
        analysis_date: "2026-03-19",
        overall_score: 72,
        summary: "昨日の分析サマリー",
      }),
      mockData.analysis({
        pid: "analysis-hist-2",
        analysis_date: "2026-03-18",
        overall_score: 65,
        summary: "一昨日の分析サマリー",
      }),
    ];
    await mockAnalysis(page, null, historyItems);
    await page.goto("/analysis/history");

    await expect(page.getByText("分析履歴")).toBeVisible();
    await expect(page.getByText("2026-03-19")).toBeVisible();
    await expect(page.getByText("2026-03-18")).toBeVisible();
    await expect(page.getByText("72", { exact: true })).toBeVisible();
    await expect(page.getByText("65", { exact: true })).toBeVisible();
  });
});
