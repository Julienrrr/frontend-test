import { expect, type Page } from '@playwright/test'

export interface ApplicantCredentials {
  email: string
  password: string
}

/** Registers a fresh Applicant and signs in through the UI, like a real user. */
export async function signUpAndSignIn(
  page: Page,
): Promise<ApplicantCredentials> {
  const credentials = {
    email: `applicant-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Secret!1',
  }

  await page.goto('/create-account')
  await page.getByLabel('Email address').fill(credentials.email)
  await page.getByLabel('Password', { exact: true }).fill(credentials.password)
  await page.getByLabel('Confirm password').fill(credentials.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { name: 'Account created' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Sign in' }).click()
  await signIn(page, credentials)
  return credentials
}

export async function signIn(
  page: Page,
  { email, password }: ApplicantCredentials,
): Promise<void> {
  await expect(page).toHaveURL('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/applications\//)
}

/** Starts the signed-in Applicant's draft from the journey page and opens its first step. */
export async function startApplication(page: Page): Promise<void> {
  await page.goto('/applications/current')
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(page).toHaveURL(/\/applications\/[^/]+\/personal-details$/)
}
