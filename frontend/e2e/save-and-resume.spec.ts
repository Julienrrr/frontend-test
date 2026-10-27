import { expect, test } from '@playwright/test'

import { signIn, signUpAndSignIn, startApplication } from './applicant'

test('saved answers come back from the API after signing out and in again', async ({
  page,
}) => {
  const credentials = await signUpAndSignIn(page)
  await startApplication(page)
  const stepUrl = page.url()

  await page.getByLabel('Name (required)').fill('Ada Lovelace')
  await page.getByLabel('Date of birth (required)').fill('1815-12-10')
  await page.getByRole('checkbox', { name: /I confirm these details/ }).check()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Your answers were saved.')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, credentials)

  await expect(page).toHaveURL(stepUrl)
  await expect(page.getByLabel('Name (required)')).toHaveValue('Ada Lovelace')
  await expect(page.getByLabel('Date of birth (required)')).toHaveValue(
    '1815-12-10',
  )
  await expect(
    page.getByRole('checkbox', { name: /I confirm these details/ }),
  ).toBeChecked()
})
