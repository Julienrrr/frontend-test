import {
  Alert,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  Typography,
} from '@kyc/ui'
import {
  data,
  isRouteErrorResponse,
  useNavigate,
  useRevalidator,
  useRouteError,
} from 'react-router'
import { z } from 'zod'

import { ApiError } from '../../../api/apiErrors'
import {
  getApplicantApplicationForm,
  type ApplicationStep,
} from '../../../api/applicantApplications'
import styles from '../_components/applicationStep.module.css'
import { ApplicationStepForm } from '../_components/ApplicationStepForm'
import { withApplicantSession } from '../_utils/withApplicantSession'

import type { Route } from './+types/$step'

const formSteps: readonly string[] = [
  'personal-details',
  'identity-and-address',
] satisfies ApplicationStep[]

function isApplicationStep(step: string): step is ApplicationStep {
  return formSteps.includes(step)
}

// The contract identifies applications by UUID; anything else cannot exist.
const applicationIdSchema = z.guid()

export async function clientLoader({
  params,
  request,
}: Route.ClientLoaderArgs) {
  if (
    !applicationIdSchema.safeParse(params.applicationId).success ||
    (params.step !== 'review' && !isApplicationStep(params.step))
  ) {
    throw data(null, { status: 404 })
  }
  try {
    const form = await withApplicantSession(() =>
      getApplicantApplicationForm(params.applicationId, request.signal),
    )
    return { form }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw data(null, { status: 404 })
    }
    throw error
  }
}

export default function CurrentApplicationStepPage({
  params,
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const applicationPath = `/applications/${params.applicationId}`

  if (!isApplicationStep(params.step)) {
    return (
      <ReviewPlaceholder
        onSubmit={() => void navigate(`${applicationPath}/submitted`)}
        onReturn={() =>
          void navigate(`${applicationPath}/identity-and-address`)
        }
      />
    )
  }

  const step = params.step
  return (
    <ApplicationStepForm
      // A new step or a reloaded form starts from the saved answers again.
      key={`${step}-${loaderData.form.version}`}
      form={loaderData.form}
      step={step}
      onBack={() =>
        void navigate(
          step === 'personal-details'
            ? '/applications/current'
            : `${applicationPath}/personal-details`,
        )
      }
      onReload={() => void revalidator.revalidate()}
      onContinue={() =>
        void navigate(
          step === 'personal-details'
            ? `${applicationPath}/identity-and-address`
            : `${applicationPath}/review`,
        )
      }
    />
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <main className={styles.page}>
        <Stack spacing={2}>
          <Typography component="h1" variant="heading">
            Application not found
          </Typography>
          <Alert severity="error">This application is not available.</Alert>
          <Link href="/applications/current">Go to your application</Link>
        </Stack>
      </main>
    )
  }
  throw error
}

// Final review and submission are outside the scope of the save-and-resume work.
function ReviewPlaceholder({
  onSubmit,
  onReturn,
}: {
  onSubmit: () => void
  onReturn: () => void
}) {
  return (
    <main className={styles.reviewPage}>
      <Card className={styles.reviewCard}>
        <CardContent>
          <Stack spacing={2}>
            <Typography component="h1" variant="heading">
              Review application
            </Typography>
            <Typography>Your application is ready for review.</Typography>
            <label>
              <input type="checkbox" /> I confirm the information is complete
              and accurate.
            </label>
            <Button onClick={onSubmit}>Submit</Button>
            <Button variant="secondary" onClick={onReturn}>
              Return to form
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </main>
  )
}
