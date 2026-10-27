import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../../../test/server'

import { CreateAccountForm } from './CreateAccountForm'

expect.extend(toHaveNoViolations)

const accountsPath = '/api/v1/applicant-accounts'

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const user = userEvent.setup()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CreateAccountForm />
    </QueryClientProvider>,
  )
  return { user, ...view }
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { email = 'ada@example.com' }: { email?: string } = {},
) {
  await user.type(screen.getByLabelText('Email address'), email)
  await user.type(screen.getByLabelText('Password'), 'Secret!1')
  await user.type(screen.getByLabelText('Confirm password'), 'Secret!1')
}

function submitButton() {
  return screen.getByRole('button', {
    name: /create account|creating account/i,
  })
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

describe('CreateAccountForm', () => {
  it('has no detectable accessibility violations', async () => {
    const { container } = renderForm()

    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows field errors, focuses the first one and sends nothing when invalid', async () => {
    const request = vi.fn()
    server.use(http.post(accountsPath, request))
    const { user } = renderForm()

    await user.click(submitButton())

    const email = screen.getByLabelText('Email address')
    expect(email).toHaveFocus()
    expect(email).toHaveAccessibleDescription('Enter an email address.')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      /six characters.*Enter a password\./,
    )
    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAccessibleDescription('Confirm your password.')
    expect(request).not.toHaveBeenCalled()
  })

  it('clears a field error once the field is edited', async () => {
    const { user } = renderForm()
    await user.click(submitButton())

    await user.type(screen.getByLabelText('Email address'), 'a')

    expect(
      screen.getByLabelText('Email address'),
    ).not.toHaveAccessibleDescription('Enter an email address.')
  })

  it('creates the account and offers sign-in without signing the applicant in', async () => {
    let body: unknown
    server.use(
      http.post(accountsPath, async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 201 })
      }),
    )
    const { user, container } = renderForm()

    await fillForm(user, { email: '  ada@example.com ' })
    await user.click(submitButton())

    const heading = await screen.findByRole('heading', {
      name: 'Account created',
    })
    expect(heading).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    )
    expect(body).toEqual({
      data: {
        type: 'applicant-accounts',
        attributes: { email: 'ada@example.com', password: 'Secret!1' },
      },
    })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows API validation errors next to their fields', async () => {
    server.use(
      http.post(accountsPath, () =>
        errorResponse(
          400,
          'validation-failed',
          'Enter a valid email address.',
          '/data/attributes/email',
        ),
      ),
    )
    const { user } = renderForm()

    await fillForm(user)
    await user.click(submitButton())

    const email = screen.getByLabelText('Email address')
    await vi.waitFor(() => expect(email).toHaveFocus())
    expect(email).toHaveAccessibleDescription('Enter a valid email address.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains a duplicate email on the email field and keeps the entered values', async () => {
    server.use(
      http.post(accountsPath, () =>
        errorResponse(
          409,
          'email-already-registered',
          'An account already exists for this email address.',
        ),
      ),
    )
    const { user } = renderForm()

    await fillForm(user)
    await user.click(submitButton())

    const email = screen.getByLabelText('Email address')
    await vi.waitFor(() => expect(email).toHaveFocus())
    expect(email).toHaveAccessibleDescription(
      'An account already exists for this email address.',
    )
    expect(email).toHaveValue('ada@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('Secret!1')
  })

  it('announces rate limiting with the delay and blocks retries meanwhile', async () => {
    server.use(
      http.post(accountsPath, () => {
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
  })

  it('explains a network failure and keeps the entered values', async () => {
    server.use(http.post(accountsPath, () => HttpResponse.error()))
    const { user } = renderForm()

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't reach the server. Check your connection and try again.",
    )
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'ada@example.com',
    )
    expect(submitButton()).toBeEnabled()
  })

  it('explains a timeout and lets the applicant try again', async () => {
    const timeout = AbortSignal.timeout.bind(AbortSignal)
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => timeout(20))
    server.use(
      http.post(accountsPath, async () => {
        await delay('infinite')
        return new HttpResponse(null, { status: 201 })
      }),
    )
    const { user } = renderForm()

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server took too long to respond. Please try again.',
    )
    expect(submitButton()).toBeEnabled()
    vi.restoreAllMocks()
  })

  it('sends a single request while one is pending', async () => {
    const request = vi.fn()
    server.use(
      http.post(accountsPath, async () => {
        request()
        await delay(50)
        return new HttpResponse(null, { status: 201 })
      }),
    )
    const { user } = renderForm()

    await fillForm(user)
    await user.click(submitButton())
    expect(submitButton()).toHaveTextContent('Creating account…')
    await user.click(submitButton())
    await user.type(screen.getByLabelText('Confirm password'), '{Enter}')

    await screen.findByRole('heading', { name: 'Account created' })
    expect(request).toHaveBeenCalledOnce()
  })
})
