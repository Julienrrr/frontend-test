import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { createRoutesStub } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../../../test/server'

import CurrentApplicationStepPage, {
  clientLoader,
  ErrorBoundary,
} from './$step'

expect.extend(toHaveNoViolations)

const applicationId = '4745524d-345f-4de8-8d52-1291217447ec'
const formPath = `/api/v1/applicant-applications/${applicationId}/form`

function formResponse(
  answers: Record<string, unknown>,
  documentEvidencePresent = false,
) {
  return HttpResponse.json({
    data: {
      type: 'applicant-application-forms',
      id: applicationId,
      attributes: {
        status: 'draft',
        currentStep: 'personal-details',
        steps: [
          { step: 'personal-details', state: 'current' },
          { step: 'identity-and-address', state: 'remaining' },
        ],
        answers,
        documentEvidence: { present: documentEvidencePresent },
        version: 4,
      },
    },
  })
}

function errorResponse(status: number, code: string) {
  return HttpResponse.json(
    {
      errors: [{ status: String(status), code, title: 'Error', detail: code }],
    },
    { status },
  )
}

function renderStep(path: string) {
  const Stub = createRoutesStub([
    {
      path: '/applications/:applicationId/:step',
      // The stub passes plain loader args; the route only reads `params` and `request`.
      loader: ({ params, request }) =>
        clientLoader({ params, request } as Parameters<typeof clientLoader>[0]),
      Component: CurrentApplicationStepPage,
      ErrorBoundary,
    },
    { path: '/sign-in', Component: () => <h1>Sign in page</h1> },
  ])
  return render(<Stub initialEntries={[path]} />)
}

describe('application step page', () => {
  it('fills every field with the answers saved through the API', async () => {
    server.use(
      http.get(formPath, () =>
        formResponse({
          name: 'Ada Lovelace',
          dateOfBirth: '1815-12-10',
          phone: null,
          consentConfirmed: true,
        }),
      ),
    )
    const { container } = renderStep(
      `/applications/${applicationId}/personal-details`,
    )

    expect(await screen.findByLabelText('Name (required)')).toHaveValue(
      'Ada Lovelace',
    )
    expect(screen.getByLabelText('Date of birth (required)')).toHaveValue(
      '1815-12-10',
    )
    expect(
      screen.getByLabelText('Date of birth (required)'),
    ).toHaveAccessibleDescription('Format: YYYY-MM-DD')
    expect(screen.getByLabelText('Phone (required)')).toHaveValue('')
    expect(
      screen.getByRole('checkbox', { name: /I confirm these details/ }),
    ).toBeChecked()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows second-step answers and whether a document is on file', async () => {
    server.use(
      http.get(formPath, () =>
        formResponse({ documentType: 'Passport', city: 'London' }, true),
      ),
    )
    renderStep(`/applications/${applicationId}/identity-and-address`)

    expect(
      await screen.findByLabelText('Document type (required)'),
    ).toHaveValue('Passport')
    expect(screen.getByLabelText('City (required)')).toHaveValue('London')
    expect(
      screen.getByLabelText('Document evidence (required)'),
    ).toHaveAccessibleDescription(
      'A document is already on file for this application.',
    )
    expect(
      screen.getByLabelText('Document evidence (required)'),
    ).not.toBeRequired()
  })

  it('reports an application that is not visible to the applicant', async () => {
    server.use(
      http.get(formPath, () => errorResponse(404, 'application-not-found')),
    )
    renderStep(`/applications/${applicationId}/personal-details`)

    expect(
      await screen.findByRole('heading', { name: 'Application not found' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['an id that is not a UUID', '/applications/prototype/personal-details'],
    ['an unknown step', `/applications/${applicationId}/bogus-step`],
  ])('reports %s without calling the API', async (_, path) => {
    const request = vi.fn()
    server.use(http.get(/\/form$/, request))
    renderStep(path)

    expect(
      await screen.findByRole('heading', { name: 'Application not found' }),
    ).toBeInTheDocument()
    expect(request).not.toHaveBeenCalled()
  })

  it('sends a signed-out applicant to sign-in', async () => {
    server.use(
      http.get(formPath, () => errorResponse(401, 'authentication-required')),
    )
    renderStep(`/applications/${applicationId}/personal-details`)

    expect(
      await screen.findByRole('heading', { name: 'Sign in page' }),
    ).toBeInTheDocument()
  })
})
