import { useEffect } from 'react'

import { ApiError } from '../../../api/apiErrors'

/**
 * Reports whether `error` is a rate limit with a Retry-After delay, and calls `onUnlock`
 * once that delay has passed so the caller can clear the error and accept retries again.
 */
export function useRetryAfterLock(
  error: Error | null,
  onUnlock: () => void,
): boolean {
  const retryAfterSeconds =
    error instanceof ApiError ? error.retryAfterSeconds : undefined

  useEffect(() => {
    if (retryAfterSeconds === undefined) {
      return undefined
    }
    const timer = setTimeout(onUnlock, retryAfterSeconds * 1000)
    return () => clearTimeout(timer)
  }, [error, retryAfterSeconds, onUnlock])

  return retryAfterSeconds !== undefined
}
