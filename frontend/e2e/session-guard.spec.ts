import { expect, test } from '@playwright/test'

test('signed-out applicants are sent to sign-in instead of the application', async ({
  page,
}) => {
  await page.goto('/applications/current')

  await expect(page).toHaveURL('/sign-in')
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible()
})
