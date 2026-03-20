import { test, expect } from '@playwright/test'
import { setLoggedIn, setLoggedOut } from './helpers/auth'
import { mockLoginSuccess, mockLoginFailure, setupDefaultMocks } from './helpers/mocks'

test.describe('認証', () => {
  test('ログインページが正しく表示される', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('健康管理アプリ')).toBeVisible()
    await expect(page.getByLabel('メールアドレス')).toBeVisible()
    await expect(page.getByLabel('パスワード')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible()
    await expect(page.getByText('新規登録')).toBeVisible()
  })

  test('正常なログイン → /dashboard にリダイレクト', async ({ page }) => {
    await mockLoginSuccess(page)
    await setupDefaultMocks(page)

    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill('test@example.com')
    await page.getByLabel('パスワード').fill('password123')
    await page.getByRole('button', { name: 'ログイン' }).click()

    await page.waitForURL('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })

  test('無効な認証情報 → エラーメッセージ表示', async ({ page }) => {
    await mockLoginFailure(page)

    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill('wrong@example.com')
    await page.getByLabel('パスワード').fill('wrongpassword')
    await page.getByRole('button', { name: 'ログイン' }).click()

    await expect(page.getByText('メールアドレスまたはパスワードが正しくありません')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('未認証で保護ルートにアクセス → /login にリダイレクト', async ({ page }) => {
    await setLoggedOut(page)

    await page.goto('/dashboard')

    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })

  test('ログアウト → /login にリダイレクト', async ({ page }) => {
    await setLoggedIn(page)
    await setupDefaultMocks(page)

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()

    await page.getByRole('button', { name: 'ログアウト' }).click()

    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })
})
