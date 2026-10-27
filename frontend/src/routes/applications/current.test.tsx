import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createRoutesStub, Outlet } from 'react-router'
import { describe, expect, it } from 'vitest'

import { server } from '../../test/server'

import CurrentApplicationJourneyPage from './current'

import type { ApplicantApplication } from '../../api/applicantApplications'

const applicationId = '4745524d-345f-4de8-8d52-1291217447ec'
const stepHref = `/applications/${applicationId}/identity-and-address`

const draft: ApplicantApplication = {
  id: applicationId,
  currentStep: 'identity-and-address',
  progress: [
    { step: 'personal-details', state: 'complete' },
    { step: 'identity-and-address', state: 'current' },
  ],
  href: stepHref,
}

function renderCurrentPage(currentApplication: ApplicantApplication | null) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const Stub = createRoutesStub([
    {
      id: 'routes/applications',
      path: '/applications',
      Component: Outlet,
      loader: () => ({ currentApplication }),
      children: [
        { path: 'current', Component: CurrentApplicationJourneyPage },
        {
          path: ':applicationId/:step',
          Component: () => <h1>Application step</h1>,
        },
      ],
    },
    { path: '/sign-in', Component: () => <h1>Sign in page</h1> },
  ])
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <Stub initialEntries={['/applications/current']} />
      </QueryClientProvider>,
    ),
  }
}

describe('current application journey', () => {
  it('starts a draft and opens the step the API returns', async () => {
    server.use(
      http.post('/api/v1/applicant-applications', () =>
        HttpResponse.json(
          {
            data: {
              type: 'applicant-applications',
              id: applicationId,
              attributes: {
                status: 'draft',
                currentStep: 'personal-details',
                progress: [
                  { step: 'personal-details', state: 'current' },
                  { step: 'identity-and-address', state: 'not-started' },
                ],
                href: `/applications/${applicationId}/personal-details`,
              },
            },
          },
          { status: 201 },
        ),
      ),
    )
    const { user } = renderCurrentPage(null)

    await user.click(
      await screen.findByRole('button', { name: 'Start application' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Application step' }),
    ).toBeInTheDocument()
  })

  it('resumes the saved draft with its real progress', async () => {
    const { user } = renderCurrentPage(draft)

    expect(
      await screen.findByRole('heading', {
        name: 'Resume your KYC application',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('list', { name: 'Application progress' }),
    ).toHaveTextContent(
      /Personal details.*Complete.*Identity and address.*Current step/,
    )

    await user.click(screen.getByRole('button', { name: 'Resume application' }))

    expect(
      await screen.findByRole('heading', { name: 'Application step' }),
    ).toBeInTheDocument()
  })

  it('explains a failed start and lets the applicant try again', async () => {
    server.use(
      http.post('/api/v1/applicant-applications', () => HttpResponse.error()),
    )
    const { user } = renderCurrentPage(null)

    await user.click(
      await screen.findByRole('button', { name: 'Start application' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't reach the server. Check your connection and try again.",
    )
    expect(
      screen.getByRole('button', { name: 'Start application' }),
    ).toBeEnabled()
  })

  it('sends the applicant to sign-in when the session ended', async () => {
    server.use(
      http.post('/api/v1/applicant-applications', () =>
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
    const { user } = renderCurrentPage(null)

    await user.click(
      await screen.findByRole('button', { name: 'Start application' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Sign in page' }),
    ).toBeInTheDocument()
  })
})
