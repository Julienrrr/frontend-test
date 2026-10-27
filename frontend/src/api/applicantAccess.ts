import { z } from 'zod'

import { UnexpectedResponseError } from './apiErrors'
import { requestJsonApi } from './jsonApiClient'

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
    attributes: z.object({
      href: z.string().transform((href, context) => {
        const path = toSameOriginPath(href)
        if (path === undefined) {
          context.addIssue({
            code: 'custom',
            message: 'The journey href must stay on this site.',
          })
          return z.NEVER
        }
        return path
      }),
    }),
  }),
})

/**
 * Signs an Applicant in; the browser stores the session and CSRF cookies from the response.
 * Rejects a journey href that would leave the site, so callers can navigate to it safely.
 */
export async function createApplicantSession(
  credentials: Credentials,
): Promise<ApplicantSession> {
  const document = await requestJsonApi('/api/v1/applicant-sessions', {
    method: 'POST',
    body: { data: { type: 'applicant-sessions', attributes: credentials } },
    schema: applicantSessionDocumentSchema,
  })
  if (!document) {
    throw new UnexpectedResponseError()
  }
  return { href: document.data.attributes.href }
}

// Parsing with the URL API catches tricks such as `/\evil.example`, which browsers treat as `//evil.example`.
function toSameOriginPath(href: string): string | undefined {
  try {
    const url = new URL(href, window.location.origin)
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : undefined
  } catch {
    return undefined
  }
}
