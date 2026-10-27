export interface SignInValues {
  email: string
  password: string
}

export interface RegistrationValues extends SignInValues {
  passwordConfirmation: string
}

/** One message per invalid field; an empty object means the values are valid. */
export type CredentialErrors<Values> = Partial<Record<keyof Values, string>>

// Mirrors the API's validation so client and server reject the same input with the same wording.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const uppercasePattern = /\p{Lu}/u
const specialCharacterPattern = /[^\p{L}\p{Nd}]/u
const minimumPasswordLength = 6

export function normalizeEmail(email: string): string {
  return email.trim()
}

export function validateSignIn(
  values: SignInValues,
): CredentialErrors<SignInValues> {
  const errors: CredentialErrors<SignInValues> = {}
  if (normalizeEmail(values.email) === '') {
    errors.email = 'Enter an email address.'
  }
  if (isBlank(values.password)) {
    errors.password = 'Enter a password.'
  }
  return errors
}

export function validateRegistration(
  values: RegistrationValues,
): CredentialErrors<RegistrationValues> {
  const errors: CredentialErrors<RegistrationValues> = validateSignIn(values)
  if (!errors.email && !emailPattern.test(normalizeEmail(values.email))) {
    errors.email = 'Enter a valid email address.'
  }
  if (!errors.password && !meetsPasswordPolicy(values.password)) {
    errors.password =
      'Use at least 6 characters including an uppercase letter and special character.'
  }
  if (values.passwordConfirmation === '') {
    errors.passwordConfirmation = 'Confirm your password.'
  } else if (values.passwordConfirmation !== values.password) {
    errors.passwordConfirmation = 'Passwords do not match.'
  }
  return errors
}

function meetsPasswordPolicy(password: string): boolean {
  return (
    password.length >= minimumPasswordLength &&
    uppercasePattern.test(password) &&
    specialCharacterPattern.test(password)
  )
}

function isBlank(value: string): boolean {
  return value.trim() === ''
}
