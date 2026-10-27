import { z } from 'zod'

import { sameOriginPathSchema } from './_utils/sameOriginPath'
import { requestJsonApi, requestJsonApiDocument } from './jsonApiClient'

export interface Credentials {
  email: string
  password: string
}

export interface ApplicantSession {
  /** Same-origin journey path to open after sign-in. */
  href: string
}

/** Registers an Applicant; the API does not sign them in. */
export async function createApplicantAccount(
  credentials: Credentials,
): Promise<void> {
  await requestJsonApi('/api/v1/applicant-accounts', {
    method: 'POST',
    body: { data: { type: 'applicant-accounts', attributes: credentials } },
  })
}

const applicantSessionDocumentSchema = z.object({
  data: z.object({
    type: z.literal('applicant-sessions'),
    id: z.string(),
    attributes: z.object({ href: sameOriginPathSchema }),
  }),
})

/**
 * Signs an Applicant in; the browser stores the session and CSRF cookies from the response.
 * Rejects a journey href that would leave the site, so callers can navigate to it safely.
 */
export async function createApplicantSession(
  credentials: Credentials,
): Promise<ApplicantSession> {
  const document = await requestJsonApiDocument('/api/v1/applicant-sessions', {
    method: 'POST',
    body: { data: { type: 'applicant-sessions', attributes: credentials } },
    schema: applicantSessionDocumentSchema,
  })
  return { href: document.data.attributes.href }
}
