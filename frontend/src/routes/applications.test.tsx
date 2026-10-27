import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'

import ApplicationsLayout, { clientLoader, ErrorBoundary } from './applications'

const currentPath = '/api/v1/applicant-applications/current'

function renderApplications() {
  const Stub = createRoutesStub([
    {
      path: '/applications',
      Component: ApplicationsLayout,
      // The stub passes plain loader args; the route only reads `request`.
      loader: ({ request }) =>
        clientLoader({ request } as Parameters<typeof clientLoader>[0]),
      ErrorBoundary,
      children: [
        { path: 'current', Component: () => <h1>Current application</h1> },
      ],
    },
    { path: '/sign-in', Component: () => <h1>Sign in page</h1> },
  ])
  return render(<Stub initialEntries={['/applications/current']} />)
}

describe('applications layout', () => {
  it('renders the page when a session is active', async () => {
    server.use(
      http.get(currentPath, () => new HttpResponse(null, { status: 204 })),
    )
    renderApplications()

    expect(
      await screen.findByRole('heading', { name: 'Current application' }),
    ).toBeInTheDocument()
  })

  it('sends signed-out applicants to sign-in', async () => {
    server.use(
      http.get(currentPath, () =>
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
    renderApplications()

    expect(
      await screen.findByRole('heading', { name: 'Sign in page' }),
    ).toBeInTheDocument()
  })

  it('offers a retry when the application cannot be loaded', async () => {
    server.use(http.get(currentPath, () => HttpResponse.error()))
    renderApplications()

    expect(
      await screen.findByRole('heading', {
        name: 'Your application could not be loaded',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
  })
})
