import { redirect } from 'react-router'

import { ApiError } from '../../../api/apiErrors'

/**
 * Runs a route loader's request and sends signed-out Applicants to sign-in.
 * This only shapes navigation: the API still authorizes every request.
 */
export async function withApplicantSession<T>(
  load: () => Promise<T>,
): Promise<T> {
  try {
    return await load()
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw redirect('/sign-in')
    }
    throw error
  }
}
