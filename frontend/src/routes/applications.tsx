import { Alert, Button, Stack, Typography } from '@kyc/ui'
import { Outlet, useRevalidator } from 'react-router'

import { getCurrentApplicantApplication } from '../api/applicantApplications'

import { withApplicantSession } from './applications/_utils/withApplicantSession'

import type { Route } from './+types/applications'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const currentApplication = await withApplicantSession(() =>
    getCurrentApplicantApplication(request.signal),
  )
  return { currentApplication }
}

// Re-check the session and refresh the draft on every navigation, not only on entry.
export function shouldRevalidate() {
  return true
}

export default function ApplicationsLayout() {
  return <Outlet />
}

export function ErrorBoundary() {
  const revalidator = useRevalidator()
  return (
    <main>
      <Stack spacing={2}>
        <Typography component="h1" variant="heading">
          Your application could not be loaded
        </Typography>
        <Alert severity="error">
          Something went wrong while loading your application. Please try again.
        </Alert>
        <Button
          isPending={revalidator.state === 'loading'}
          onPress={() => void revalidator.revalidate()}
        >
          Try again
        </Button>
      </Stack>
    </main>
  )
}
