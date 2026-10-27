import { describe, expect, it } from 'vitest'

import {
  ApiError,
  NetworkError,
  UnexpectedResponseError,
} from '../api/apiErrors'

import { requestErrorMessage } from './requestErrorMessages'

describe('requestErrorMessage', () => {
  it.each([
    [1, 'Too many attempts. Try again in 1 second.'],
    [30, 'Too many attempts. Try again in 30 seconds.'],
    [60, 'Too many attempts. Try again in 1 minute.'],
    [899, 'Too many attempts. Try again in 15 minutes.'],
    [undefined, 'Too many attempts. Try again in a few minutes.'],
  ])('rounds a Retry-After of %s up for display', (seconds, message) => {
    expect(requestErrorMessage(new ApiError(429, [], seconds))).toBe(message)
  })

  it('distinguishes an unreachable server from a slow one', () => {
    expect(requestErrorMessage(new NetworkError('unreachable'))).toBe(
      "We couldn't reach the server. Check your connection and try again.",
    )
    expect(requestErrorMessage(new NetworkError('timeout'))).toBe(
      'The server took too long to respond. Please try again.',
    )
  })

  it('falls back to a generic message', () => {
    expect(requestErrorMessage(new ApiError(503, []))).toBe(
      'Something went wrong. Please try again.',
    )
    expect(requestErrorMessage(new UnexpectedResponseError())).toBe(
      'Something went wrong. Please try again.',
    )
  })
})
