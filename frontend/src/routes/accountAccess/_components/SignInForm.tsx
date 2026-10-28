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
import { useState } from 'react'

import {
  useFieldErrors,
  type FieldErrors,
} from '../../../_hooks/useFieldErrors'
import { requestErrorMessage } from '../../../_utils/requestErrorMessages'
import { ApiError, fieldErrorsFrom } from '../../../api/apiErrors'
import { createApplicantSession } from '../../../api/applicantAccess'
import { useRetryAfterLock } from '../_hooks/useRetryAfterLock'
import {
  normalizeEmail,
  validateSignIn,
  type SignInValues,
} from '../_utils/credentialRules'

import styles from './accountAccess.module.css'

export interface SignInFormProps {
  onNavigate?: (href: string) => void
  onSuccess: (href: string) => void
}

type SignInField = keyof SignInValues

const fieldOrder: readonly SignInField[] = ['email', 'password']

export function SignInForm({ onNavigate, onSuccess }: SignInFormProps) {
  const [values, setValues] = useState<SignInValues>({
    email: '',
    password: '',
  })
  const {
    fieldErrors,
    inputRef,
    showFieldErrors,
    clearFieldError,
    clearFieldErrors,
  } = useFieldErrors(fieldOrder)

  const signIn = useMutation({
    mutationFn: createApplicantSession,
    onSuccess: ({ href }) => onSuccess(href),
    onError: (error) => {
      const apiFieldErrors = signInFieldErrors(error)
      if (Object.keys(apiFieldErrors).length > 0) {
        showFieldErrors(apiFieldErrors)
      } else if (isRejectedCredentials(error)) {
        setValues((current) => ({ ...current, password: '' }))
      }
    },
  })
  const isRetryLocked = useRetryAfterLock(signIn.error, signIn.reset)

  function updateField(field: SignInField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    clearFieldError(field)
  }

  function submit() {
    if (signIn.isPending || isRetryLocked) {
      return
    }
    const errors = validateSignIn(values)
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors)
      return
    }
    clearFieldErrors()
    signIn.mutate({
      email: normalizeEmail(values.email),
      password: values.password,
    })
  }

  const formError = signInFormError(signIn.error)

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
                Welcome back
              </Typography>
              <Typography tone="muted">
                Sign in to continue your KYC application.
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
              autoComplete="current-password"
              errorMessage={fieldErrors.password}
              fullWidth
              id="applicant-password"
              inputRef={inputRef('password')}
              label="Password"
              name="password"
              onChange={(event) => updateField('password', event.target.value)}
              required
              type="password"
              value={values.password}
            />
            <Button
              className={styles.submit}
              fullWidth
              isDisabled={isRetryLocked}
              isPending={signIn.isPending}
              size="large"
              type="submit"
            >
              {signIn.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
            <Typography
              className={styles.footer}
              align="center"
              variant="caption"
            >
              <span>New to KYC? </span>
              <Link
                href="/create-account"
                onClick={(event) => {
                  if (onNavigate) {
                    event.preventDefault()
                    onNavigate('/create-account')
                  }
                }}
              >
                Create account
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </main>
  )
}

// Wrong and unusable passwords get the same answer as unknown emails, so the form never says which credential failed.
function isRejectedCredentials(error: Error): boolean {
  return (
    error instanceof ApiError &&
    (error.hasCode('invalid-credentials') ||
      (error.status === 400 && 'password' in fieldErrorsFrom(error)))
  )
}

// Only a malformed email is shown on its field: it says nothing about any account.
function signInFieldErrors(error: Error): FieldErrors<SignInField> {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return {}
  }
  const { email } = fieldErrorsFrom(error)
  return email ? { email } : {}
}

function signInFormError(error: Error | null): string | undefined {
  if (!error || Object.keys(signInFieldErrors(error)).length > 0) {
    return undefined
  }
  if (isRejectedCredentials(error)) {
    return 'Invalid email or password.'
  }
  return requestErrorMessage(error)
}
