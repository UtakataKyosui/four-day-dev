import { expect, test } from "@playwright/test";
import { setLoggedIn } from "./helpers/auth";
import { mockAnalysis, mockData, mockMeals, mockSleep } from "./helpers/mocks";

test.describe("ダッシュボード", () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page);
    await mockMeals(page, [
      mockData.meal({ pid: "meal-1", meal_type: "breakfast", notes: "オートミール、バナナ" }),
      mockData.meal({ pid: "meal-2", meal_type: "lunch", notes: "チキンサラダ、ご飯" }),
    ]);
    await mockSleep(page, [mockData.sleepRecord()]);
    await mockAnalysis(page, mockData.analysis());
  });

  test("今日の食事サマリーカードが表示される", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("今日の食事")).toBeVisible();
    await expect(page.getByText("オートミール、バナナ")).toBeVisible();
    await expect(page.getByText("チキンサラダ、ご飯")).toBeVisible();
    await expect(page.getByText("2/3 記録済み")).toBeVisible();
  });

  test("睡眠データカードが表示される", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("昨夜の睡眠")).toBeVisible();
    await expect(page.getByText("8時間")).toBeVisible();
    await expect(page.getByText("効率: 85%")).toBeVisible();
  });

  test("分析スコアカードが表示される", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("健康分析")).toBeVisible();
    // ダッシュボードの分析スコアは "78/100" 形式で表示されるため toContainText を使用
    const analysisCard = page.locator(".bg-card").filter({ hasText: "健康分析" });
    await expect(analysisCard.locator(".text-2xl")).toContainText("78");
  });

  test("食事詳細ページへのリンクが機能する", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("今日の食事")).toBeVisible();

    const mealsCard = page.locator(".bg-card").filter({ hasText: "今日の食事" });
    await mealsCard.getByText("詳細").click();

    await page.waitForURL("/meals/");
    await expect(page).toHaveURL("/meals/");
  });

  test("睡眠詳細ページへのリンクが機能する", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("昨夜の睡眠")).toBeVisible();

    const sleepCard = page.locator(".bg-card").filter({ hasText: "昨夜の睡眠" });
    await sleepCard.getByText("詳細").click();

    await page.waitForURL("/sleep/");
    await expect(page).toHaveURL("/sleep/");
  });

  test("健康分析ページへのリンクが機能する", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("健康分析")).toBeVisible();

    const analysisCard = page.locator(".bg-card").filter({ hasText: "健康分析" });
    await analysisCard.getByText("詳細").click();

    await page.waitForURL("/analysis/");
    await expect(page).toHaveURL("/analysis/");
  });
});
