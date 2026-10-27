import { z } from 'zod'

import { sameOriginPathSchema } from './_utils/sameOriginPath'
import { requestJsonApi, requestJsonApiDocument } from './jsonApiClient'

export type ApplicationStep = 'personal-details' | 'identity-and-address'
export type StepState = 'complete' | 'current' | 'remaining'

export interface StepProgress {
  step: ApplicationStep
  state: StepState
}

export interface ApplicantApplication {
  id: string
  currentStep: ApplicationStep
  progress: StepProgress[]
  /** Same-origin path of the step to resume. */
  href: string
}

export const answerFields = [
  'name',
  'dateOfBirth',
  'country',
  'nationality',
  'email',
  'phone',
  'documentType',
  'documentNumber',
  'documentCountry',
  'expiry',
  'street',
  'city',
  'postal',
  'residentialCountry',
] as const

export type AnswerField = (typeof answerFields)[number]
export type Answers = Partial<Record<AnswerField, string>>

export interface ApplicationForm {
  applicationId: string
  currentStep: ApplicationStep
  steps: StepProgress[]
  answers: Answers
  consentConfirmed: boolean
  documentEvidencePresent: boolean
  version: number
}

export interface ApplicationFormUpdate {
  step: ApplicationStep
  /** Answers for `step` only; the API rejects fields of another step. */
  answers: Answers
  consentConfirmed?: boolean
  version: number
}

const applicationsPath = '/api/v1/applicant-applications'

const stepSchema = z.enum(['personal-details', 'identity-and-address'])

// The two endpoints name an untouched step differently; the UI only knows `remaining`.
const stepProgressSchema = z.object({
  step: stepSchema,
  state: z
    .enum(['complete', 'current', 'remaining', 'not-started'])
    .transform((state): StepState =>
      state === 'not-started' ? 'remaining' : state,
    ),
})

const applicationDocumentSchema = z.object({
  data: z.object({
    type: z.literal('applicant-applications'),
    id: z.string(),
    attributes: z.object({
      currentStep: stepSchema,
      progress: z.array(stepProgressSchema),
      href: sameOriginPathSchema,
    }),
  }),
})

const formDocumentSchema = z.object({
  data: z.object({
    type: z.literal('applicant-application-forms'),
    id: z.string(),
    attributes: z.object({
      currentStep: stepSchema,
      steps: z.array(stepProgressSchema),
      answers: z.record(z.string(), z.unknown()),
      documentEvidence: z.object({ present: z.boolean() }),
      version: z.number().int().nonnegative(),
    }),
  }),
})

/** Returns the signed-in Applicant's draft, or `null` when they have not started one. */
export async function getCurrentApplicantApplication(
  signal?: AbortSignal,
): Promise<ApplicantApplication | null> {
  const document = await requestJsonApi(`${applicationsPath}/current`, {
    schema: applicationDocumentSchema,
    signal,
  })
  return document ? toApplicantApplication(document) : null
}

/** Starts a draft, or returns the existing one so repeated calls never duplicate it. */
export async function createApplicantApplication(): Promise<ApplicantApplication> {
  const document = await requestJsonApiDocument(applicationsPath, {
    method: 'POST',
    schema: applicationDocumentSchema,
  })
  return toApplicantApplication(document)
}

export async function getApplicantApplicationForm(
  applicationId: string,
  signal?: AbortSignal,
): Promise<ApplicationForm> {
  const document = await requestJsonApiDocument(formPath(applicationId), {
    schema: formDocumentSchema,
    signal,
  })
  return toApplicationForm(document)
}

/** Saves one step and resolves with the form state the API persisted. */
export async function updateApplicantApplicationForm(
  applicationId: string,
  { step, answers, consentConfirmed, version }: ApplicationFormUpdate,
): Promise<ApplicationForm> {
  const document = await requestJsonApiDocument(formPath(applicationId), {
    method: 'PATCH',
    body: {
      data: {
        type: 'applicant-application-forms',
        id: applicationId,
        attributes: {
          step,
          answers:
            consentConfirmed === undefined
              ? answers
              : { ...answers, consentConfirmed },
          version,
        },
      },
    },
    schema: formDocumentSchema,
  })
  return toApplicationForm(document)
}

function formPath(applicationId: string): string {
  return `${applicationsPath}/${encodeURIComponent(applicationId)}/form`
}

function toApplicantApplication({
  data,
}: z.infer<typeof applicationDocumentSchema>): ApplicantApplication {
  return { id: data.id, ...data.attributes }
}

function toApplicationForm({
  data,
}: z.infer<typeof formDocumentSchema>): ApplicationForm {
  const { answers, documentEvidence, ...attributes } = data.attributes
  return {
    ...attributes,
    applicationId: data.id,
    answers: savedAnswers(answers),
    consentConfirmed: answers.consentConfirmed === true,
    documentEvidencePresent: documentEvidence.present,
  }
}

// Unanswered fields may be omitted or null; only strings are saved answers.
function savedAnswers(raw: Record<string, unknown>): Answers {
  const answers: Answers = {}
  for (const field of answerFields) {
    const value = raw[field]
    if (typeof value === 'string') {
      answers[field] = value
    }
  }
  return answers
}
