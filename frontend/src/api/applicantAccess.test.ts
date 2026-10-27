import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'

import { createApplicantAccount } from './applicantAccess'

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
