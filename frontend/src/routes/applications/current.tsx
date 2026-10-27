import { useMutation } from '@tanstack/react-query'
import { useNavigate, useRouteLoaderData } from 'react-router'

import { requestErrorMessage } from '../../_utils/requestErrorMessages'
import { ApiError } from '../../api/apiErrors'
import {
  createApplicantApplication,
  type StepProgress,
} from '../../api/applicantApplications'

import { ApplicantJourneyPresentation } from './_components/ApplicantJourneyPresentation'

import type { clientLoader as applicationsLoader } from '../applications'

const notStartedProgress: readonly StepProgress[] = [
  { step: 'personal-details', state: 'current' },
  { step: 'identity-and-address', state: 'remaining' },
]

export default function CurrentApplicationJourneyPage() {
  const navigate = useNavigate()
  // The applications layout already loaded the draft while checking the session.
  const layoutData = useRouteLoaderData<typeof applicationsLoader>(
    'routes/applications',
  )
  const currentApplication = layoutData?.currentApplication ?? null

  const start = useMutation({
    mutationFn: createApplicantApplication,
    onSuccess: ({ href }) => void navigate(href),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        void navigate('/sign-in')
      }
    },
  })

  if (currentApplication) {
    return (
      <ApplicantJourneyPresentation
        entryState="resume"
        progress={currentApplication.progress}
        onPrimaryAction={() => void navigate(currentApplication.href)}
      />
    )
  }

  return (
    <ApplicantJourneyPresentation
      entryState="start"
      progress={notStartedProgress}
      isPending={start.isPending}
      errorMessage={start.error ? requestErrorMessage(start.error) : undefined}
      onPrimaryAction={() => {
        if (!start.isPending) {
          start.mutate()
        }
      }}
    />
  )
}
