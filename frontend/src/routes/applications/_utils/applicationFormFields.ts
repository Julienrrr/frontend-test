import type {
  AnswerField,
  Answers,
  ApplicationStep,
} from '../../../api/applicantApplications'

export interface ApplicationFormField {
  name: AnswerField
  label: string
  /** Lets browsers and password managers fill the field (WCAG 1.3.5). */
  autoComplete?: string
  helperText?: string
}

const dateFormat = 'Format: YYYY-MM-DD'

/** The prototype's fields for each step, keyed by their API answer names. */
export const applicationStepFields: Record<
  ApplicationStep,
  readonly ApplicationFormField[]
> = {
  'personal-details': [
    { name: 'name', label: 'Name', autoComplete: 'name' },
    {
      name: 'dateOfBirth',
      label: 'Date of birth',
      autoComplete: 'bday',
      helperText: dateFormat,
    },
    { name: 'country', label: 'Country', autoComplete: 'country-name' },
    { name: 'nationality', label: 'Nationality' },
    { name: 'email', label: 'Email', autoComplete: 'email' },
    { name: 'phone', label: 'Phone', autoComplete: 'tel' },
  ],
  'identity-and-address': [
    { name: 'documentType', label: 'Document type' },
    { name: 'documentNumber', label: 'Document number' },
    { name: 'documentCountry', label: 'Document country' },
    { name: 'expiry', label: 'Expiry', helperText: dateFormat },
    { name: 'street', label: 'Street', autoComplete: 'street-address' },
    { name: 'city', label: 'City', autoComplete: 'address-level2' },
    { name: 'postal', label: 'Postal code', autoComplete: 'postal-code' },
    {
      name: 'residentialCountry',
      label: 'Residential country',
      autoComplete: 'country-name',
    },
  ],
}

export const applicationStepTitles: Record<ApplicationStep, string> = {
  'personal-details': 'Personal details',
  'identity-and-address': 'Identity and address',
}

/** Every field of `step`, with saved answers filled in and the rest empty. */
export function stepAnswers(step: ApplicationStep, saved: Answers): Answers {
  return Object.fromEntries(
    applicationStepFields[step].map(({ name }) => [name, saved[name] ?? '']),
  ) as Answers
}
