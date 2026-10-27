import { describe, expect, it } from 'vitest'

import { ApiError, NetworkError } from '../../../api/apiErrors'

import { withApplicantSession } from './withApplicantSession'

describe('withApplicantSession', () => {
  it('returns what the request loaded', async () => {
    await expect(withApplicantSession(async () => 'draft')).resolves.toBe(
      'draft',
    )
  })

  it('redirects to sign-in when the API reports no session', async () => {
    const outcome = await withApplicantSession(async () => {
      throw new ApiError(401, [])
    }).catch((caught: unknown) => caught)

    expect(outcome).toBeInstanceOf(Response)
    expect((outcome as Response).headers.get('Location')).toBe('/sign-in')
  })

  it('lets other failures reach the error boundary', async () => {
    const failure = new NetworkError('unreachable')

    await expect(
      withApplicantSession(async () => {
        throw failure
      }),
    ).rejects.toBe(failure)
  })
})
