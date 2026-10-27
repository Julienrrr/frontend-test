import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../../../test/server'

import { ApplicationStepForm } from './ApplicationStepForm'

import type { ApplicationForm } from '../../../api/applicantApplications'

expect.extend(toHaveNoViolations)

const applicationId = '4745524d-345f-4de8-8d52-1291217447ec'
const formPath = `/api/v1/applicant-applications/${applicationId}/form`

const savedForm: ApplicationForm = {
  applicationId,
  currentStep: 'personal-details',
  steps: [
    { step: 'personal-details', state: 'current' },
    { step: 'identity-and-address', state: 'remaining' },
  ],
  answers: { name: 'Ada Lovelace' },
  consentConfirmed: false,
  documentEvidencePresent: false,
  version: 3,
}

function formResponse(answers: Record<string, unknown>, version: number) {
  return HttpResponse.json({
    data: {
      type: 'applicant-application-forms',
      id: applicationId,
      attributes: {
        status: 'draft',
        currentStep: 'personal-details',
        steps: savedForm.steps,
        answers,
        documentEvidence: { present: false },
        version,
      },
    },
  })
}

function errorResponse(status: number, code: string, detail = code) {
  return HttpResponse.json(
    { errors: [{ status: String(status), code, title: 'Error', detail }] },
    { status },
  )
}

function renderForm() {
  const onContinue = vi.fn()
  const onReload = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ApplicationStepForm
        form={savedForm}
        step="personal-details"
        onBack={vi.fn()}
        onContinue={onContinue}
        onReload={onReload}
      />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), onContinue, onReload, ...view }
}

function saveButton() {
  return screen.getByRole('button', { name: /^(save|saving…)$/i })
}

describe('saving the application step', () => {
  it('saves the step answers with the form version and confirms only after the API does', async () => {
    let body: unknown
    server.use(
      http.patch(formPath, async ({ request }) => {
        body = await request.json()
        await delay(30)
        return formResponse(
          { name: 'Ada Lovelace', phone: '+44 20', consentConfirmed: true },
          4,
        )
      }),
    )
    const { user } = renderForm()

    await user.type(screen.getByLabelText('Phone (required)'), ' +44 20 ')
    await user.click(screen.getByRole('checkbox'))
    await user.click(saveButton())

    expect(saveButton()).toHaveTextContent('Saving…')
    expect(
      screen.queryByText('Your answers were saved.'),
    ).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your answers were saved.',
    )
    expect(body).toEqual({
      data: {
        type: 'applicant-application-forms',
        id: applicationId,
        attributes: {
          step: 'personal-details',
          answers: {
            name: 'Ada Lovelace',
            dateOfBirth: '',
            country: '',
            nationality: '',
            email: '',
            phone: ' +44 20 ',
            consentConfirmed: true,
          },
          version: 3,
        },
      },
    })
    // The form shows what the API persisted, here trimmed.
    expect(screen.getByLabelText('Phone (required)')).toHaveValue('+44 20')
  })

  it('stops claiming the answers are saved once they change, and saves with the new version', async () => {
    const versions: unknown[] = []
    server.use(
      http.patch(formPath, async ({ request }) => {
        const sent = (await request.json()) as {
          data: { attributes: { version: number } }
        }
        versions.push(sent.data.attributes.version)
        return formResponse({ name: 'Ada' }, sent.data.attributes.version + 1)
      }),
    )
    const { user } = renderForm()

    await user.click(saveButton())
    await screen.findByText('Your answers were saved.')
    await user.type(screen.getByLabelText('Country (required)'), 'UK')

    expect(
      screen.queryByText('Your answers were saved.'),
    ).not.toBeInTheDocument()
    await user.click(saveButton())
    await screen.findByText('Your answers were saved.')
    expect(versions).toEqual([3, 4])
  })

  it('keeps the entered answers and lets the applicant retry after a failure', async () => {
    server.use(
      http.patch(formPath, () => errorResponse(503, 'submission-unavailable'), {
        once: true,
      }),
      http.patch(formPath, () => formResponse({ name: 'Ada Lovelace' }, 4)),
    )
    const { user, container } = renderForm()

    await user.type(screen.getByLabelText('Country (required)'), 'UK')
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your answers were not saved. Please try again.',
    )
    expect(
      screen.queryByText('Your answers were saved.'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Country (required)')).toHaveValue('UK')
    expect(await axe(container)).toHaveNoViolations()

    await user.click(saveButton())
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your answers were saved.',
    )
  })

  it.each([
    [
      401,
      'authentication-required',
      'Your session has ended, so your answers were not saved.',
    ],
    [
      403,
      'access-denied',
      'Your session has ended, so your answers were not saved.',
    ],
    [
      422,
      'unprocessable-form',
      'Your answers were not saved. The submitted form could not be accepted.',
    ],
    [
      404,
      'application-not-found',
      'This application is no longer available, so your answers were not saved.',
    ],
  ])('explains a %s response', async (status, code, message) => {
    server.use(
      http.patch(formPath, () =>
        errorResponse(
          status,
          code,
          status === 422 ? 'The submitted form could not be accepted.' : code,
        ),
      ),
    )
    const { user } = renderForm()

    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('offers to reload the saved answers after a version conflict', async () => {
    server.use(
      http.patch(formPath, () => errorResponse(409, 'form-version-conflict')),
    )
    const { user, onReload } = renderForm()

    await user.click(saveButton())
    await user.click(
      await screen.findByRole('button', { name: 'Reload saved answers' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'replaces what you entered here',
    )
    expect(onReload).toHaveBeenCalledOnce()
  })

  it('distinguishes a lost connection from an unconfirmed save', async () => {
    server.use(http.patch(formPath, () => HttpResponse.error()))
    const { user } = renderForm()

    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your answers were not saved. Check your connection and try again.',
    )
  })

  it('moves on only once Continue has saved the step', async () => {
    server.use(
      http.patch(formPath, () => errorResponse(503, 'submission-unavailable'), {
        once: true,
      }),
      http.patch(formPath, () => formResponse({ name: 'Ada Lovelace' }, 4)),
    )
    const { user, onContinue } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('alert')
    expect(onContinue).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await vi.waitFor(() => expect(onContinue).toHaveBeenCalledOnce())
  })
})
