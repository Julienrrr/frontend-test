import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { createRoutesStub } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createGate } from '../test/gate'
import { server } from '../test/server'

import { ApplicantHeader } from './applications/_components/ApplicantHeader'
import SignOutRoute, { clientAction, ErrorBoundary } from './signOut'

expect.extend(toHaveNoViolations)

const sessionPath = '/api/v1/applicant-sessions/current'

function renderSignedInPage() {
  const Stub = createRoutesStub([
    {
      path: '/applications/current',
      Component: () => (
        <>
          <ApplicantHeader />
          <h1>Current application</h1>
        </>
      ),
    },
    {
      path: '/sign-out',
      Component: SignOutRoute,
      action: () => clientAction(),
      ErrorBoundary,
    },
    { path: '/sign-in', Component: () => <h1>Sign in page</h1> },
  ])
  return {
    user: userEvent.setup(),
    ...render(<Stub initialEntries={['/applications/current']} />),
  }
}

describe('sign out', () => {
  it('has no detectable accessibility violations in the header', async () => {
    const { container } = renderSignedInPage()

    await screen.findByRole('heading', { name: 'Current application' })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('revokes the session and opens sign-in', async () => {
    const request = vi.fn()
    const response = createGate()
    server.use(
      http.delete(sessionPath, async () => {
        request()
        await response.opened
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderSignedInPage()

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(
      screen.getByRole('button', { name: 'Signing out…' }),
    ).toHaveAttribute('aria-disabled', 'true')
    response.open()
    expect(
      await screen.findByRole('heading', { name: 'Sign in page' }),
    ).toBeInTheDocument()
    expect(request).toHaveBeenCalledOnce()
  })

  it('treats an already expired session as signed out', async () => {
    server.use(
      http.delete(sessionPath, () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '401',
                code: 'authentication-required',
                title: 'Authentication required',
                detail: 'Sign in to continue.',
              },
            ],
          },
          { status: 401 },
        ),
      ),
    )
    const { user } = renderSignedInPage()

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(
      await screen.findByRole('heading', { name: 'Sign in page' }),
    ).toBeInTheDocument()
  })

  it('says the applicant is still signed in when sign-out fails', async () => {
    server.use(http.delete(sessionPath, () => HttpResponse.error()))
    const { user } = renderSignedInPage()

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(
      await screen.findByRole('heading', { name: 'You are still signed in' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't sign you out. Please try again.",
    )
  })
})
