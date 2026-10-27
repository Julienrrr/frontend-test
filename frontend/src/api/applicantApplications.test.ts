import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'

import { UnexpectedResponseError } from './apiErrors'
import {
  createApplicantApplication,
  getApplicantApplicationForm,
  getCurrentApplicantApplication,
  updateApplicantApplicationForm,
} from './applicantApplications'

const applicationId = '4745524d-345f-4de8-8d52-1291217447ec'
const formPath = `/api/v1/applicant-applications/${applicationId}/form`

function applicationResponse(
  href = `/applications/${applicationId}/personal-details`,
) {
  return HttpResponse.json({
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
        href,
      },
    },
  })
}

function formResponse(answers: Record<string, unknown>, version = 1) {
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
        documentEvidence: { present: false },
        version,
      },
    },
  })
}

const expectedApplication = {
  id: applicationId,
  currentStep: 'personal-details',
  progress: [
    { step: 'personal-details', state: 'current' },
    { step: 'identity-and-address', state: 'remaining' },
  ],
  href: `/applications/${applicationId}/personal-details`,
}

describe('getCurrentApplicantApplication', () => {
  it('returns null when the Applicant has not started an application', async () => {
    server.use(
      http.get(
        '/api/v1/applicant-applications/current',
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    await expect(getCurrentApplicantApplication()).resolves.toBeNull()
  })

  it('returns the draft with progress in the UI vocabulary', async () => {
    server.use(
      http.get('/api/v1/applicant-applications/current', () =>
        applicationResponse(),
      ),
    )

    await expect(getCurrentApplicantApplication()).resolves.toEqual(
      expectedApplication,
    )
  })

  it('rejects a resume href that would leave the site', async () => {
    server.use(
      http.get('/api/v1/applicant-applications/current', () =>
        applicationResponse('https://evil.example/applications/x'),
      ),
    )

    await expect(getCurrentApplicantApplication()).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    )
  })
})

describe('createApplicantApplication', () => {
  it('starts or retrieves the draft', async () => {
    server.use(
      http.post('/api/v1/applicant-applications', () => applicationResponse()),
    )

    await expect(createApplicantApplication()).resolves.toEqual(
      expectedApplication,
    )
  })
})

describe('getApplicantApplicationForm', () => {
  it('keeps saved answers and separates consent and evidence', async () => {
    server.use(
      http.get(formPath, () =>
        formResponse({ name: 'Ada', phone: null, consentConfirmed: true }, 3),
      ),
    )

    await expect(getApplicantApplicationForm(applicationId)).resolves.toEqual({
      applicationId,
      currentStep: 'personal-details',
      steps: [
        { step: 'personal-details', state: 'current' },
        { step: 'identity-and-address', state: 'remaining' },
      ],
      answers: { name: 'Ada' },
      consentConfirmed: true,
      documentEvidencePresent: false,
      version: 3,
    })
  })
})

describe('updateApplicantApplicationForm', () => {
  it('sends one step with its version and returns the persisted form', async () => {
    let body: unknown
    server.use(
      http.patch(formPath, async ({ request }) => {
        body = await request.json()
        return formResponse({ name: 'Ada', consentConfirmed: true }, 2)
      }),
    )

    const form = await updateApplicantApplicationForm(applicationId, {
      step: 'personal-details',
      answers: { name: 'Ada', phone: '' },
      consentConfirmed: true,
      version: 1,
    })

    expect(body).toEqual({
      data: {
        type: 'applicant-application-forms',
        id: applicationId,
        attributes: {
          step: 'personal-details',
          answers: { name: 'Ada', phone: '', consentConfirmed: true },
          version: 1,
        },
      },
    })
    expect(form).toMatchObject({ answers: { name: 'Ada' }, version: 2 })
  })

  it('leaves consent out when it is not part of the step', async () => {
    let body: { data: { attributes: { answers: object } } } | undefined
    server.use(
      http.patch(formPath, async ({ request }) => {
        body = (await request.json()) as typeof body
        return formResponse({ city: 'Paris' }, 2)
      }),
    )

    await updateApplicantApplicationForm(applicationId, {
      step: 'identity-and-address',
      answers: { city: 'Paris' },
      version: 1,
    })

    expect(body?.data.attributes.answers).toEqual({ city: 'Paris' })
  })
})
