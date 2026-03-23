import { expect, test } from "@playwright/test";
import { setLoggedIn } from "./helpers/auth";
import { mockAnalysis, mockData, mockMeals, mockSleep } from "./helpers/mocks";

test.describe("食事記録", () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page);
    await mockSleep(page, [], false);
    await mockAnalysis(page, null);
  });

  test("朝食・昼食・夕食の 3 グリッドが表示される", async ({ page }) => {
    await mockMeals(page, []);
    await page.goto("/meals");

    await expect(page.getByRole("heading", { name: "朝食" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "昼食" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "夕食" })).toBeVisible();
  });

  test("食事メモを入力して保存できる", async ({ page }) => {
    await mockMeals(page, []);
    await page.goto("/meals");

    // 朝食カードのテキストエリアに入力
    const breakfastCard = page.locator(".bg-card").filter({ hasText: "朝食" }).first();
    await breakfastCard.locator("textarea").fill("オートミール、牛乳、バナナ");
    await breakfastCard.getByRole("button", { name: "保存" }).click();

    // 保存後にメモテキストが表示される
    await expect(breakfastCard.getByText("オートミール、牛乳、バナナ")).toBeVisible();
  });

  test("既存メモの編集ができる", async ({ page }) => {
    const existingMeal = mockData.meal({
      pid: "meal-pid-1",
      meal_type: "breakfast",
      notes: "元のメモ",
    });
    await mockMeals(page, [existingMeal]);
    await page.goto("/meals");

    // 朝食カードの編集ボタンをクリック
    const breakfastCard = page.locator(".bg-card").filter({ hasText: "朝食" }).first();
    await expect(breakfastCard.getByText("元のメモ")).toBeVisible();
    await breakfastCard.getByRole("button", { name: "編集" }).click();

    // テキストエリアに既存メモが入っている
    const textarea = breakfastCard.locator("textarea");
    await expect(textarea).toHaveValue("元のメモ");

    // 内容を変更して保存
    await textarea.fill("更新されたメモ");
    await breakfastCard.getByRole("button", { name: "保存" }).click();

    // 更新後の内容が表示される
    await expect(breakfastCard.getByText("更新されたメモ")).toBeVisible();
  });

  test("食事記録を削除できる", async ({ page }) => {
    const existingMeal = mockData.meal({
      pid: "meal-pid-1",
      meal_type: "breakfast",
      notes: "削除するメモ",
    });
    await mockMeals(page, [existingMeal]);
    await page.goto("/meals");

    const breakfastCard = page.locator(".bg-card").filter({ hasText: "朝食" }).first();
    await expect(breakfastCard.getByText("削除するメモ")).toBeVisible();

    // ダイアログを承認してから削除ボタンをクリック
    page.once("dialog", (dialog) => dialog.accept());
    await breakfastCard.getByRole("button", { name: "削除" }).click();

    // 削除後はフォームが表示される（メモなし状態）
    await expect(breakfastCard.locator("textarea")).toBeVisible();
    await expect(breakfastCard.getByText("削除するメモ")).not.toBeVisible();
  });

  test("日付ナビゲーションで別の日に移動できる", async ({ page }) => {
    await mockMeals(page, []);
    await page.goto("/meals");

    // 現在の日付テキストを確認
    const dateNav = page
      .locator(".flex.items-center.gap-3")
      .filter({ has: page.getByLabel("前の日") });

    // 「前の日」ボタンをクリック
    await page.getByLabel("前の日").click();

    // 「今日」ボタンが現れる（今日以外の日付になった証拠）
    await expect(page.getByText("今日")).toBeVisible();

    // 「次の日」ボタンをクリックして今日に戻る
    await page.getByLabel("次の日").click();
    await expect(page.getByText("今日")).not.toBeVisible();

    // dateNav が存在することを確認（ウィジェット全体が壊れていない）
    await expect(dateNav).toBeVisible();
  });
});
