import { Alert, Box, Button, Stack, TextField, Typography } from '@kyc/ui'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { useFieldErrors } from '../../../_hooks/useFieldErrors'
import {
  updateApplicantApplicationForm,
  type AnswerField,
  type ApplicationForm,
  type ApplicationStep,
} from '../../../api/applicantApplications'
import {
  applicationStepFields,
  applicationStepTitles,
  missingStepAnswers,
  stepAnswers,
  stepFieldOrder,
} from '../_utils/applicationFormFields'

import styles from './applicationStep.module.css'
import { SaveErrorAlert } from './SaveErrorAlert'

export interface ApplicationStepFormProps {
  /** Saved form state from the API; the form starts from it, never from browser storage. */
  form: ApplicationForm
  step: ApplicationStep
  onBack: () => void
  /** Called once the step's answers are saved. */
  onContinue: () => void
  /** Loads the latest saved form again, replacing the entered answers. */
  onReload: () => void
}

export function ApplicationStepForm({
  form,
  step,
  onBack,
  onContinue,
  onReload,
}: ApplicationStepFormProps) {
  const [answers, setAnswers] = useState(() => stepAnswers(step, form.answers))
  const [consentConfirmed, setConsentConfirmed] = useState(
    form.consentConfirmed,
  )
  const [version, setVersion] = useState(form.version)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveIntent, setSaveIntent] = useState<'save' | 'continue'>('save')
  const isFirstStep = step === 'personal-details'
  const {
    fieldErrors,
    inputRef,
    showFieldErrors,
    clearFieldError,
    clearFieldErrors,
  } = useFieldErrors(stepFieldOrder(step))

  const save = useMutation({
    mutationFn: () =>
      updateApplicantApplicationForm(form.applicationId, {
        step,
        answers,
        consentConfirmed: isFirstStep ? consentConfirmed : undefined,
        version,
      }),
    onSuccess: (saved) => {
      // Show what the API persisted (it trims values, for example), not the local copy.
      setAnswers(stepAnswers(step, saved.answers))
      setConsentConfirmed(saved.consentConfirmed)
      setVersion(saved.version)
      setHasUnsavedChanges(false)
    },
  })

  function updateAnswer(field: AnswerField, value: string) {
    setAnswers((current) => ({ ...current, [field]: value }))
    setHasUnsavedChanges(true)
    clearFieldError(field)
  }

  function saveAnswers(intent: 'save' | 'continue') {
    if (save.isPending) {
      return
    }
    // Saving a draft accepts gaps; moving on needs the step to be complete.
    if (intent === 'continue') {
      const missing = missingStepAnswers(step, answers, consentConfirmed)
      if (Object.keys(missing).length > 0) {
        showFieldErrors(missing)
        return
      }
      clearFieldErrors()
    }
    setSaveIntent(intent)
    save.mutate(undefined, {
      onSuccess: intent === 'continue' ? onContinue : undefined,
    })
  }

  const isSaved = save.isSuccess && !hasUnsavedChanges
  const isSaving = save.isPending && saveIntent === 'save'
  const isContinuing = save.isPending && saveIntent === 'continue'

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
              saveAnswers('continue')
            }}
            spacing={2}
          >
            {applicationStepFields[step].map((field) => (
              <TextField
                autoComplete={field.autoComplete}
                errorMessage={fieldErrors[field.name]}
                helperText={field.helperText}
                inputRef={inputRef(field.name)}
                key={field.name}
                label={`${field.label} (required)`}
                name={field.name}
                onChange={(event) =>
                  updateAnswer(field.name, event.target.value)
                }
                // Read-only rather than disabled while saving, so focus stays where it is.
                readOnly={save.isPending}
                required
                value={answers[field.name] ?? ''}
              />
            ))}
            {isFirstStep ? (
              <Stack component="div" spacing={0.5}>
                <label>
                  <input
                    aria-describedby={
                      fieldErrors.consentConfirmed ? 'consent-error' : undefined
                    }
                    aria-invalid={
                      fieldErrors.consentConfirmed ? true : undefined
                    }
                    checked={consentConfirmed}
                    name="consentConfirmed"
                    onChange={(event) => {
                      if (!save.isPending) {
                        setConsentConfirmed(event.target.checked)
                        setHasUnsavedChanges(true)
                        clearFieldError('consentConfirmed')
                      }
                    }}
                    ref={inputRef('consentConfirmed')}
                    required
                    type="checkbox"
                  />{' '}
                  I confirm these details are accurate and belong to me.
                </label>
                {fieldErrors.consentConfirmed ? (
                  <Typography id="consent-error" className={styles.fieldError}>
                    {fieldErrors.consentConfirmed}
                  </Typography>
                ) : null}
              </Stack>
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
            {save.error ? (
              <SaveErrorAlert error={save.error} onReload={onReload} />
            ) : null}
            {isSaved ? (
              <Alert severity="success">Your answers were saved.</Alert>
            ) : null}
            <Stack
              component="div"
              className={styles.formActions}
              direction="row"
              spacing={2}
            >
              <Button type="button" variant="quiet" onPress={onBack}>
                Back
              </Button>
              <Stack component="div" direction="row" spacing={2}>
                <Button
                  isPending={isSaving}
                  onPress={() => saveAnswers('save')}
                  type="button"
                  variant="secondary"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
                <Button isPending={isContinuing} type="submit">
                  {isFirstStep ? 'Continue' : 'Save and review'}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </main>
  )
}
