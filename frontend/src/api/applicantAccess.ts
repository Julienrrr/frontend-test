import { requestJsonApi } from './jsonApiClient'

export interface Credentials {
  email: string
  password: string
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
