import { test, expect } from '@playwright/test'
import { setLoggedIn } from './helpers/auth'
import { mockMeals, mockSleep, mockAnalysis, mockData } from './helpers/mocks'

test.describe('睡眠記録', () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page)
    await mockMeals(page, [])
    await mockAnalysis(page, null)
  })

  test('睡眠記録の一覧が表示される', async ({ page }) => {
    await mockSleep(page, [
      mockData.sleepRecord({ duration_minutes: 480, efficiency: 85 }),
    ])
    await page.goto('/sleep')

    await expect(page.getByText('8時間')).toBeVisible()
    await expect(page.getByText('効率 85%')).toBeVisible()
  })

  test('手動で睡眠を追加できる', async ({ page }) => {
    await mockSleep(page, [])
    await page.goto('/sleep')

    // データなし状態で「手動で追加する」リンクが表示される
    await expect(page.getByText('この日の睡眠データはありません')).toBeVisible()
    await page.getByText('手動で追加する').click()

    // フォームが表示される
    await expect(page.getByText('手動で睡眠を記録')).toBeVisible()

    // フォームに入力
    await page.locator('input[type="datetime-local"]').first().fill('2026-03-19T23:00')
    await page.locator('input[type="datetime-local"]').last().fill('2026-03-20T07:00')
    await page.locator('input[type="number"]').fill('480')

    await page.getByRole('button', { name: '保存' }).click()

    // 保存後に睡眠カードが表示される
    await expect(page.getByText('8時間')).toBeVisible()
  })

  test('睡眠記録を削除できる', async ({ page }) => {
    await mockSleep(page, [
      mockData.sleepRecord({ pid: 'sleep-pid-1', source: 'manual', duration_minutes: 420 }),
    ])
    await page.goto('/sleep')

    await expect(page.getByText('7時間')).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: '削除' }).click()

    // 削除後はデータなし状態
    await expect(page.getByText('この日の睡眠データはありません')).toBeVisible()
  })

  test('Fitbit 未連携ステータスが表示される', async ({ page }) => {
    await mockSleep(page, [], false)
    await page.goto('/sleep')

    await expect(page.getByRole('button', { name: 'Fitbitと連携する' })).toBeVisible()
  })
})
