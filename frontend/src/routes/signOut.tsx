import { Alert, Link, Stack, Typography } from '@kyc/ui'
import { redirect } from 'react-router'

import { ApiError } from '../api/apiErrors'
import { deleteCurrentApplicantSession } from '../api/applicantAccess'

// Signing out is an action submitted from a form, so visiting the URL never signs anyone out.
export function clientLoader() {
  return redirect('/applications/current')
}

export async function clientAction() {
  try {
    await deleteCurrentApplicantSession()
  } catch (error) {
    // No session means the Applicant is already signed out.
    if (!(error instanceof ApiError && error.status === 401)) {
      throw error
    }
  }
  return redirect('/sign-in')
}

export default function SignOutRoute() {
  return null
}

export function ErrorBoundary() {
  return (
    <main>
      <Stack spacing={2}>
        <Typography component="h1" variant="heading">
          You are still signed in
        </Typography>
        <Alert severity="error">
          We couldn&apos;t sign you out. Please try again.
        </Alert>
        <Link href="/applications/current">Back to your application</Link>
      </Stack>
    </main>
  )
}
