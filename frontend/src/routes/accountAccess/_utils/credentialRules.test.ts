import { describe, expect, it } from 'vitest'

import {
  validateRegistration,
  validateSignIn,
  type RegistrationValues,
} from './credentialRules'

const policyMessage =
  'Use at least 6 characters including an uppercase letter and special character.'

function registration(overrides: Partial<RegistrationValues>) {
  return validateRegistration({
    email: 'ada@example.com',
    password: 'Secret!1',
    passwordConfirmation: overrides.password ?? 'Secret!1',
    ...overrides,
  })
}

describe('validateRegistration', () => {
  it('accepts valid credentials', () => {
    expect(registration({})).toEqual({})
  })

  it('requires every field', () => {
    expect(
      validateRegistration({
        email: '',
        password: '',
        passwordConfirmation: '',
      }),
    ).toEqual({
      email: 'Enter an email address.',
      password: 'Enter a password.',
      passwordConfirmation: 'Confirm your password.',
    })
  })

  it('ignores spaces around the email address', () => {
    expect(registration({ email: '  ada@example.com ' })).toEqual({})
  })

  it.each(['ada', 'ada@example', 'ada @example.com', '@example.com'])(
    'rejects the email address %j',
    (email) => {
      expect(registration({ email }).email).toBe('Enter a valid email address.')
    },
  )

  it.each([
    ['too short', 'Ab!1'],
    ['without an uppercase letter', 'secret!1'],
    ['without a special character', 'Secret11'],
    ['where accented letters are not special characters', 'Secretéé'],
  ])('rejects a password %s', (_, password) => {
    expect(registration({ password }).password).toBe(policyMessage)
  })

  it.each([
    ['with an accented uppercase letter', 'Écrit!1'],
    ['where a space is a special character', 'Secret 1'],
  ])('accepts a password %s', (_, password) => {
    expect(registration({ password })).toEqual({})
  })

  it('treats a password of only spaces as missing', () => {
    expect(registration({ password: '      ' }).password).toBe(
      'Enter a password.',
    )
  })

  it('requires the confirmation to match the password', () => {
    expect(registration({ passwordConfirmation: 'Secret!2' })).toEqual({
      passwordConfirmation: 'Passwords do not match.',
    })
  })
})

describe('validateSignIn', () => {
  it('only requires both fields', () => {
    expect(validateSignIn({ email: '', password: ' ' })).toEqual({
      email: 'Enter an email address.',
      password: 'Enter a password.',
    })
    expect(validateSignIn({ email: 'ada', password: 'abc' })).toEqual({})
  })
})
