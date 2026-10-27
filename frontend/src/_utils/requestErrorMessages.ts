import { ApiError, NetworkError } from '../api/apiErrors'

/** Form-level message for failures that no field can explain. */
export function requestErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 429) {
    return `Too many attempts. Try again in ${retryDelay(error.retryAfterSeconds)}.`
  }
  if (error instanceof NetworkError) {
    return error.kind === 'timeout'
      ? 'The server took too long to respond. Please try again.'
      : "We couldn't reach the server. Check your connection and try again."
  }
  return 'Something went wrong. Please try again.'
}

function retryDelay(seconds: number | undefined): string {
  if (!seconds) {
    return 'a few minutes'
  }
  if (seconds < 60) {
    return seconds === 1 ? '1 second' : `${seconds} seconds`
  }
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}
