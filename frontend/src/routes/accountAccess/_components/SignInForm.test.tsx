import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { createGate } from '../../../test/gate'
import { server } from '../../../test/server'

import { SignInForm } from './SignInForm'

expect.extend(toHaveNoViolations)

const sessionsPath = '/api/v1/applicant-sessions'

function renderForm() {
  const onSuccess = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const user = userEvent.setup()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SignInForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  )
  return { user, onSuccess, ...view }
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { email = 'ada@example.com', password = 'Secret!1' } = {},
) {
  await user.type(screen.getByLabelText('Email address'), email)
  await user.type(screen.getByLabelText('Password'), password)
}

function submitButton() {
  return screen.getByRole('button', { name: /sign in|signing in/i })
}

function sessionResponse(href: string) {
  return HttpResponse.json(
    {
      data: {
        type: 'applicant-sessions',
        id: '2ce2e8b5-bed0-5fce-8157-1f3a1daaac80',
        attributes: { href },
      },
    },
    { status: 201 },
  )
}

function errorResponse(
  status: number,
  code: string,
  detail: string,
  pointer?: string,
) {
  return HttpResponse.json(
    {
      errors: [
        {
          status: String(status),
          code,
          title: 'Error',
          detail,
          ...(pointer ? { source: { pointer } } : {}),
        },
      ],
    },
    { status },
  )
}

describe('SignInForm', () => {
  it('has no detectable accessibility violations', async () => {
    const { container } = renderForm()

    expect(await axe(container)).toHaveNoViolations()
  })

  it('requires both fields and sends nothing until they are filled', async () => {
    const request = vi.fn()
    server.use(http.post(sessionsPath, request))
    const { user } = renderForm()

    await user.click(submitButton())

    const email = screen.getByLabelText('Email address')
    expect(email).toHaveFocus()
    expect(email).toHaveAccessibleDescription('Enter an email address.')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Enter a password.',
    )
    expect(request).not.toHaveBeenCalled()
  })

  it('signs in and hands over the journey path returned by the API', async () => {
    let body: unknown
    server.use(
      http.post(sessionsPath, async ({ request }) => {
        body = await request.json()
        return sessionResponse('/applications/current')
      }),
    )
    const { user, onSuccess } = renderForm()

    await fillForm(user, { email: ' ada@example.com ' })
    await user.click(submitButton())

    await vi.waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith('/applications/current'),
    )
    expect(body).toEqual({
      data: {
        type: 'applicant-sessions',
        attributes: { email: 'ada@example.com', password: 'Secret!1' },
      },
    })
  })

  it('shows one generic error for invalid credentials, keeps the email and clears the password', async () => {
    server.use(
      http.post(sessionsPath, () =>
        errorResponse(401, 'invalid-credentials', 'Invalid email or password'),
      ),
    )
    const { user, container } = renderForm()

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password.',
    )
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'ada@example.com',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Email address')).not.toHaveAttribute(
      'aria-invalid',
    )
    expect(screen.getByLabelText('Password')).not.toHaveAttribute(
      'aria-invalid',
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows a malformed email next to its field', async () => {
    server.use(
      http.post(sessionsPath, () =>
        errorResponse(
          400,
          'validation-failed',
          'Enter a valid email address.',
          '/data/attributes/email',
        ),
      ),
    )
    const { user } = renderForm()

    await fillForm(user, { email: 'ada@example' })
    await user.click(submitButton())

    const email = screen.getByLabelText('Email address')
    await vi.waitFor(() => expect(email).toHaveFocus())
    expect(email).toHaveAccessibleDescription('Enter a valid email address.')
    expect(screen.getByLabelText('Password')).toHaveValue('Secret!1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('answers a password the API rejects as malformed like invalid credentials', async () => {
    server.use(
      http.post(sessionsPath, () =>
        errorResponse(
          400,
          'validation-failed',
          'Use at least 6 characters including an uppercase letter and special character.',
          '/data/attributes/password',
        ),
      ),
    )
    const { user } = renderForm()

    await fillForm(user, { password: 'x' })
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password.',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Password')).not.toHaveAttribute(
      'aria-invalid',
    )
    expect(
      screen.queryByText(/uppercase letter and special character/),
    ).not.toBeInTheDocument()
  })

  it('announces rate limiting with the delay and blocks retries meanwhile', async () => {
    server.use(
      http.post(sessionsPath, () => {
        const response = errorResponse(
          429,
          'rate-limited',
          'Too many attempts. Try again later.',
        )
        response.headers.set('Retry-After', '899')
        return response
      }),
    )
    const { user } = renderForm()

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in 15 minutes.',
    )
    expect(submitButton()).toBeDisabled()
    expect(screen.getByLabelText('Password')).toHaveValue('Secret!1')
  })

  it('explains a network failure and keeps the entered values', async () => {
    server.use(http.post(sessionsPath, () => HttpResponse.error()))
    const { user } = renderForm()

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't reach the server. Check your connection and try again.",
    )
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'ada@example.com',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('Secret!1')
  })

  it('refuses to navigate to a journey outside the site', async () => {
    server.use(
      http.post(sessionsPath, () =>
        sessionResponse('https://evil.example/applications/current'),
      ),
    )
    const { user, onSuccess } = renderForm()

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    )
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('exposes the pending state and sends a single request', async () => {
    const request = vi.fn()
    const response = createGate()
    server.use(
      http.post(sessionsPath, async () => {
        request()
        await response.opened
        return sessionResponse('/applications/current')
      }),
    )
    const { user, onSuccess } = renderForm()

    await fillForm(user)
    await user.click(submitButton())
    expect(submitButton()).toHaveTextContent('Signing in…')
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
    await user.click(submitButton())
    await user.type(screen.getByLabelText('Password'), '{Enter}')
    response.open()

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(request).toHaveBeenCalledOnce()
  })
})
