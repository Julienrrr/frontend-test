import { expect, test } from '@playwright/test'

import { signUpAndSignIn, startApplication } from './applicant'

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
  await startApplication(page)

  // Back sits directly in the actions row; Save and Continue are grouped on the other side.
  const actions = page.getByRole('button', { name: 'Back' }).locator('xpath=..')
  await expect(actions).toHaveCSS('justify-content', 'space-between')
  expect(reactWarnings).toEqual([])
})
