import { Alert, Button, Link, Stack } from '@kyc/ui'

import { ApiError, NetworkError } from '../../../api/apiErrors'

export interface SaveErrorAlertProps {
  error: Error
  /** Replaces the entered answers with the latest saved version. */
  onReload: () => void
}

/** Explains why answers were not saved, without ever implying they were. */
export function SaveErrorAlert({ error, onReload }: SaveErrorAlertProps) {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    return (
      <Alert severity="error">
        <Stack spacing={1}>
          <span>
            Your session has ended, so your answers were not saved. Sign in
            again to continue.
          </span>
          <Link href="/sign-in">Sign in again</Link>
        </Stack>
      </Alert>
    )
  }
  if (error instanceof ApiError && error.hasCode('form-version-conflict')) {
    return (
      <Alert severity="error">
        <Stack spacing={1}>
          <span>
            This application was changed somewhere else, for example in another
            tab, so your answers were not saved. Reloading shows the latest
            saved answers and replaces what you entered here.
          </span>
          <Button variant="secondary" onPress={onReload}>
            Reload saved answers
          </Button>
        </Stack>
      </Alert>
    )
  }
  if (error instanceof ApiError && error.status === 404) {
    return (
      <Alert severity="error">
        <Stack spacing={1}>
          <span>
            This application is no longer available, so your answers were not
            saved.
          </span>
          <Link href="/applications/current">Go to your application</Link>
        </Stack>
      </Alert>
    )
  }
  return <Alert severity="error">{saveErrorMessage(error)}</Alert>
}

function saveErrorMessage(error: Error): string {
  // The contract guarantees 422 details are safe to show.
  if (error instanceof ApiError && error.status === 422 && error.errors[0]) {
    return `Your answers were not saved. ${error.errors[0].detail}`
  }
  if (error instanceof NetworkError) {
    return error.kind === 'timeout'
      ? "We couldn't confirm that your answers were saved. Please try again."
      : 'Your answers were not saved. Check your connection and try again.'
  }
  return 'Your answers were not saved. Please try again.'
}
