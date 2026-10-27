import { Box, Button, Stack, TextField, Typography } from '@kyc/ui'
import { useState } from 'react'

import {
  applicationStepFields,
  applicationStepTitles,
  stepAnswers,
} from '../_utils/applicationFormFields'

import styles from './applicationStep.module.css'

import type {
  AnswerField,
  ApplicationForm,
  ApplicationStep,
} from '../../../api/applicantApplications'

export interface ApplicationStepFormProps {
  /** Saved form state from the API; the form starts from it, never from browser storage. */
  form: ApplicationForm
  step: ApplicationStep
  onBack: () => void
  onContinue: () => void
}

export function ApplicationStepForm({
  form,
  step,
  onBack,
  onContinue,
}: ApplicationStepFormProps) {
  const [answers, setAnswers] = useState(() => stepAnswers(step, form.answers))
  const [consentConfirmed, setConsentConfirmed] = useState(
    form.consentConfirmed,
  )
  const isFirstStep = step === 'personal-details'

  function updateAnswer(field: AnswerField, value: string) {
    setAnswers((current) => ({ ...current, [field]: value }))
  }

  return (
    <main className={styles.page}>
      <Box component="div" className={styles.stepContent}>
        <Stack spacing={3}>
          <Typography component="p" variant="eyebrow" tone="accent">
            STEP {isFirstStep ? '1' : '2'} OF 2
          </Typography>
          <Typography component="h1" variant="heading">
            {applicationStepTitles[step]}
          </Typography>
          <Typography tone="muted">
            Complete this form as part of the frontend implementation exercise.
          </Typography>
          <Stack
            component="form"
            className={styles.stepForm}
            onSubmit={(event) => {
              event.preventDefault()
              onContinue()
            }}
            spacing={2}
          >
            {applicationStepFields[step].map((field) => (
              <TextField
                autoComplete={field.autoComplete}
                helperText={field.helperText}
                key={field.name}
                label={`${field.label} (required)`}
                name={field.name}
                onChange={(event) =>
                  updateAnswer(field.name, event.target.value)
                }
                required
                value={answers[field.name] ?? ''}
              />
            ))}
            {isFirstStep ? (
              <label>
                <input
                  checked={consentConfirmed}
                  name="consentConfirmed"
                  onChange={(event) =>
                    setConsentConfirmed(event.target.checked)
                  }
                  required
                  type="checkbox"
                />{' '}
                I confirm these details are accurate and belong to me.
              </label>
            ) : (
              <>
                <label htmlFor="document-evidence">
                  Document evidence (required)
                </label>
                <input
                  accept="image/jpeg,image/png"
                  aria-describedby="document-evidence-status"
                  id="document-evidence"
                  required={!form.documentEvidencePresent}
                  type="file"
                />
                <Typography id="document-evidence-status" tone="muted">
                  {form.documentEvidencePresent
                    ? 'A document is already on file for this application.'
                    : 'No document has been provided yet.'}
                </Typography>
              </>
            )}
            <Stack
              component="div"
              className={styles.formActions}
              direction="row"
              spacing={2}
            >
              <Button type="button" variant="quiet" onPress={onBack}>
                Back
              </Button>
              <Button type="submit">
                {isFirstStep ? 'Continue' : 'Save and review'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </main>
  )
}
