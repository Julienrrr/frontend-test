import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'

import { UnexpectedResponseError } from './apiErrors'
import {
  createApplicantAccount,
  createApplicantSession,
  deleteCurrentApplicantSession,
} from './applicantAccess'

const credentials = { email: 'ada@example.com', password: 'Secret!1' }

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

describe('createApplicantAccount', () => {
  it('posts an applicant-accounts document and resolves on 201', async () => {
    let body: unknown
    server.use(
      http.post('/api/v1/applicant-accounts', async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 201 })
      }),
    )

    await expect(
      createApplicantAccount({
        email: 'ada@example.com',
        password: 'Secret!1',
      }),
    ).resolves.toBeUndefined()
    expect(body).toEqual({
      data: {
        type: 'applicant-accounts',
        attributes: { email: 'ada@example.com', password: 'Secret!1' },
      },
    })
  })
})

describe('createApplicantSession', () => {
  it('posts an applicant-sessions document and returns the journey path', async () => {
    let body: unknown
    server.use(
      http.post('/api/v1/applicant-sessions', async ({ request }) => {
        body = await request.json()
        return sessionResponse('/applications/current')
      }),
    )

    await expect(createApplicantSession(credentials)).resolves.toEqual({
      href: '/applications/current',
    })
    expect(body).toEqual({
      data: { type: 'applicant-sessions', attributes: credentials },
    })
  })

  it('reduces a same-origin absolute URL to its path', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () =>
        sessionResponse(
          `${window.location.origin}/applications/current?step=1`,
        ),
      ),
    )

    await expect(createApplicantSession(credentials)).resolves.toEqual({
      href: '/applications/current?step=1',
    })
  })

  it.each([
    'https://evil.example/applications/current',
    '//evil.example/applications/current',
    '/\\evil.example/applications/current',
  ])('rejects the off-site journey href %j', async (href) => {
    server.use(
      http.post('/api/v1/applicant-sessions', () => sessionResponse(href)),
    )

    await expect(createApplicantSession(credentials)).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    )
  })
})

describe('deleteCurrentApplicantSession', () => {
  it('revokes the current session', async () => {
    server.use(
      http.delete(
        '/api/v1/applicant-sessions/current',
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    await expect(deleteCurrentApplicantSession()).resolves.toBeUndefined()
  })
})
