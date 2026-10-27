import { expect, test } from '@playwright/test'

import { signUpAndSignIn } from './applicant'

test('signed-out applicants are sent to sign-in instead of the application', async ({
  page,
}) => {
  await page.goto('/applications/current')

  await expect(page).toHaveURL('/sign-in')
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible()
})

test('signing out ends the session on the server', async ({ page }) => {
  await signUpAndSignIn(page)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/sign-in')

  await page.goto('/applications/current')
  await expect(page).toHaveURL('/sign-in')
})
