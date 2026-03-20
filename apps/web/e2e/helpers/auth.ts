import type { Page } from '@playwright/test'

export const TEST_TOKEN = 'test-auth-token'

/**
 * localStorage に auth_token を注入してログイン済み状態にする。
 * page.goto() の前に呼び出すこと。
 */
export async function setLoggedIn(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    localStorage.setItem('auth_token', token)
  }, TEST_TOKEN)
}

/**
 * localStorage から auth_token を削除して未ログイン状態にする。
 * page.goto() の前に呼び出すこと。
 */
export async function setLoggedOut(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('auth_token')
  })
}
