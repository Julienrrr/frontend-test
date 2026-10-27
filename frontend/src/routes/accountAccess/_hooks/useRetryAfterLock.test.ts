import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, NetworkError } from '../../../api/apiErrors'

import { useRetryAfterLock } from './useRetryAfterLock'

describe('useRetryAfterLock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('locks for the Retry-After delay, then unlocks', () => {
    const onUnlock = vi.fn()
    const { result } = renderHook(() =>
      useRetryAfterLock(new ApiError(429, [], 30), onUnlock),
    )

    expect(result.current).toBe(true)
    vi.advanceTimersByTime(29_999)
    expect(onUnlock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onUnlock).toHaveBeenCalledOnce()
  })

  it('does not lock for other failures', () => {
    const onUnlock = vi.fn()
    const { result } = renderHook(() =>
      useRetryAfterLock(new NetworkError('unreachable'), onUnlock),
    )

    expect(result.current).toBe(false)
    vi.runAllTimers()
    expect(onUnlock).not.toHaveBeenCalled()
  })
})
