import {
  Alert,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@kyc/ui'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { ApiError, fieldErrorsFrom } from '../../../api/apiErrors'
import { createApplicantAccount } from '../../../api/applicantAccess'
import { useFieldErrors } from '../_hooks/useFieldErrors'
import { useRetryAfterLock } from '../_hooks/useRetryAfterLock'
import {
  normalizeEmail,
  validateRegistration,
  type CredentialErrors,
  type RegistrationValues,
} from '../_utils/credentialRules'
import { requestErrorMessage } from '../_utils/requestErrorMessages'
import { accountAccessHref } from '../_utils/returnTarget'

import styles from './accountAccess.module.css'

export interface CreateAccountFormProps {
  onNavigate?: (href: string) => void
  returnTo?: string
}

type RegistrationField = keyof RegistrationValues
type RegistrationErrors = CredentialErrors<RegistrationValues>

const fieldOrder: readonly RegistrationField[] = [
  'email',
  'password',
  'passwordConfirmation',
]

const passwordGuidance =
  'Use at least six characters, including one uppercase letter and one special character.'

export function CreateAccountForm({
  onNavigate,
  returnTo,
}: CreateAccountFormProps) {
  const [values, setValues] = useState<RegistrationValues>({
    email: '',
    password: '',
    passwordConfirmation: '',
  })
  const {
    fieldErrors,
    inputRef,
    showFieldErrors,
    clearFieldError,
    clearFieldErrors,
  } = useFieldErrors(fieldOrder)
  const successHeading = useRef<HTMLElement>(null)

  const registration = useMutation({
    mutationFn: createApplicantAccount,
    onError: (error) => {
      const apiFieldErrors = registrationFieldErrors(error)
      if (Object.keys(apiFieldErrors).length > 0) {
        showFieldErrors(apiFieldErrors)
      }
    },
  })
  const isRetryLocked = useRetryAfterLock(
    registration.error,
    registration.reset,
  )

  useEffect(() => {
    if (registration.isSuccess) {
      successHeading.current?.focus()
    }
  }, [registration.isSuccess])

  function updateField(field: RegistrationField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    clearFieldError(field)
  }

  function submit() {
    if (registration.isPending || isRetryLocked) {
      return
    }
    const errors = validateRegistration(values)
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors)
      return
    }
    clearFieldErrors()
    registration.mutate({
      email: normalizeEmail(values.email),
      password: values.password,
    })
  }

  const signInHref = accountAccessHref('/sign-in', returnTo)
  const signInLink = (label: string) => (
    <Link
      href={signInHref}
      onClick={(event) => {
        if (onNavigate) {
          event.preventDefault()
          onNavigate(signInHref)
        }
      }}
    >
      {label}
    </Link>
  )

  if (registration.isSuccess) {
    return (
      <main className={styles.page}>
        <Card className={styles.card}>
          <CardContent className={styles.cardContent}>
            <Stack spacing={3}>
              <Typography
                component="h1"
                variant="heading"
                ref={successHeading}
                tabIndex={-1}
              >
                Account created
              </Typography>
              <Typography>
                You can now sign in with your email address and password.
              </Typography>
              {signInLink('Sign in')}
            </Stack>
          </CardContent>
        </Card>
      </main>
    )
  }

  const formError = registrationFormError(registration.error)

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <CardContent className={styles.cardContent}>
          <Stack
            component="form"
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            spacing={3}
          >
            <Stack spacing={1}>
              <Typography component="h1" variant="heading">
                Create your account
              </Typography>
              <Typography tone="muted">
                Create credentials to begin your KYC application.
              </Typography>
            </Stack>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              autoComplete="email"
              errorMessage={fieldErrors.email}
              fullWidth
              id="applicant-email"
              inputRef={inputRef('email')}
              label="Email address"
              name="email"
              onChange={(event) => updateField('email', event.target.value)}
              required
              type="email"
              value={values.email}
            />
            <TextField
              autoComplete="new-password"
              errorMessage={fieldErrors.password}
              fullWidth
              helperText={passwordGuidance}
              id="applicant-password"
              inputRef={inputRef('password')}
              label="Password"
              name="password"
              onChange={(event) => updateField('password', event.target.value)}
              required
              type="password"
              value={values.password}
            />
            <TextField
              autoComplete="new-password"
              errorMessage={fieldErrors.passwordConfirmation}
              fullWidth
              id="applicant-password-confirmation"
              inputRef={inputRef('passwordConfirmation')}
              label="Confirm password"
              name="passwordConfirmation"
              onChange={(event) =>
                updateField('passwordConfirmation', event.target.value)
              }
              required
              type="password"
              value={values.passwordConfirmation}
            />
            <Button
              className={styles.submit}
              fullWidth
              isDisabled={isRetryLocked}
              isPending={registration.isPending}
              size="large"
              type="submit"
            >
              {registration.isPending ? 'Creating account…' : 'Create account'}
            </Button>
            <Typography
              className={styles.footer}
              align="center"
              variant="caption"
            >
              <span>Already have an account? </span>
              {signInLink('Sign in')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </main>
  )
}

/** API errors that belong next to a field rather than in the form-level alert. */
function registrationFieldErrors(error: Error): RegistrationErrors {
  if (!(error instanceof ApiError)) {
    return {}
  }
  if (error.hasCode('email-already-registered')) {
    return { email: 'An account already exists for this email address.' }
  }
  return error.status === 400 ? fieldErrorsFrom(error) : {}
}

function registrationFormError(error: Error | null): string | undefined {
  if (!error || Object.keys(registrationFieldErrors(error)).length > 0) {
    return undefined
  }
  return requestErrorMessage(error)
}
