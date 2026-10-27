import { expect, test } from '@playwright/test'

import { signUpAndSignIn } from './applicant'

test('application form lays out actions without forwarding style props to the DOM', async ({
  page,
}) => {
  const reactWarnings: string[] = []
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      message.text().includes('justifyContent')
    ) {
      reactWarnings.push(message.text())
    }
  })

  await signUpAndSignIn(page)
  await page.goto('/applications/prototype/personal-details')

  const actions = page
    .getByRole('button', { name: 'Continue' })
    .locator('xpath=..')
  await expect(actions).toHaveCSS('justify-content', 'space-between')
  expect(reactWarnings).toEqual([])
})
