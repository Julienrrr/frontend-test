import { describe, expect, it } from 'vitest'

import { ApiError, fieldErrorsFrom } from './apiErrors'

function validationError(detail: string, pointer?: string) {
  return {
    status: '400',
    code: 'validation-failed',
    title: 'Invalid attribute',
    detail,
    pointer,
  }
}

describe('ApiError', () => {
  it('uses the first error detail as its message and finds error codes', () => {
    const error = new ApiError(409, [
      {
        status: '409',
        code: 'email-already-registered',
        title: 'Account conflict',
        detail: 'An account already exists for this email address.',
      },
    ])

    expect(error.message).toBe(
      'An account already exists for this email address.',
    )
    expect(error.hasCode('email-already-registered')).toBe(true)
    expect(error.hasCode('rate-limited')).toBe(false)
  })

  it('falls back to the status when the body had no errors', () => {
    expect(new ApiError(502, []).message).toBe(
      'Request failed with status 502.',
    )
  })
})

describe('fieldErrorsFrom', () => {
  it('maps attribute pointers to field names and keeps the first message', () => {
    const error = new ApiError(400, [
      validationError('Enter a valid email address.', '/data/attributes/email'),
      validationError('Enter a password.', '/data/attributes/password'),
      validationError('Second email message.', '/data/attributes/email'),
    ])

    expect(fieldErrorsFrom(error)).toEqual({
      email: 'Enter a valid email address.',
      password: 'Enter a password.',
    })
  })

  it('ignores errors that do not point at an attribute', () => {
    const error = new ApiError(400, [
      validationError(
        'Resource type must be applicant-accounts.',
        '/data/type',
      ),
      validationError('The request body is not a valid JSON:API document.'),
    ])

    expect(fieldErrorsFrom(error)).toEqual({})
  })
})
