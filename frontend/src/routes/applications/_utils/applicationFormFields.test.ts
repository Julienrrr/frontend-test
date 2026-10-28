import { describe, expect, it } from 'vitest'

import { missingStepAnswers, stepFieldOrder } from './applicationFormFields'

describe('missingStepAnswers', () => {
  it('requires every field of the step and the consent on the first step', () => {
    expect(
      missingStepAnswers('personal-details', { name: '  ' }, false),
    ).toEqual({
      name: 'Name is required.',
      dateOfBirth: 'Date of birth is required.',
      country: 'Country is required.',
      nationality: 'Nationality is required.',
      email: 'Email is required.',
      phone: 'Phone is required.',
      consentConfirmed: 'Confirm that these details are accurate.',
    })
  })

  it('accepts a complete step', () => {
    expect(
      missingStepAnswers(
        'identity-and-address',
        {
          documentType: 'Passport',
          documentNumber: '123',
          documentCountry: 'UK',
          expiry: '2030-01-01',
          street: '1 Way',
          city: 'London',
          postal: 'N1',
          residentialCountry: 'UK',
        },
        false,
      ),
    ).toEqual({})
  })
})

describe('stepFieldOrder', () => {
  it('puts the consent checkbox after the text fields', () => {
    expect(stepFieldOrder('personal-details').at(-1)).toBe('consentConfirmed')
    expect(stepFieldOrder('identity-and-address')).not.toContain(
      'consentConfirmed',
    )
  })
})
