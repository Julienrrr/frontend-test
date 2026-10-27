import { expect, type Page } from '@playwright/test'

/** Registers a fresh Applicant and signs in through the UI, like a real user. */
export async function signUpAndSignIn(page: Page): Promise<string> {
  const email = `applicant-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  const password = 'Secret!1'

  await page.goto('/create-account')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { name: 'Account created' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/applications\//)

  return email
}
