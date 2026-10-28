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

export interface PasswordRequirement {
  label: string
  isMet: (password: string) => boolean
}

/** The API's password policy, one rule at a time, so the form can show progress. */
export const passwordRequirements: readonly PasswordRequirement[] = [
  {
    label: 'At least 6 characters',
    isMet: (password) => password.length >= 6,
  },
  {
    label: 'One uppercase letter',
    isMet: (password) => /\p{Lu}/u.test(password),
  },
  {
    // A special character is anything that is neither a letter nor a digit, as in the API.
    label: 'One special character',
    isMet: (password) => /[^\p{L}\p{Nd}]/u.test(password),
  },
]

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
  return passwordRequirements.every(({ isMet }) => isMet(password))
}

function isBlank(value: string): boolean {
  return value.trim() === ''
}
