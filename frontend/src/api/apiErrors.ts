export interface JsonApiErrorObject {
  status: string
  code: string
  title: string
  detail: string
  pointer?: string
}

/** The API answered with an error status. `errors` is empty when the body was not a JSON:API error document. */
export class ApiError extends Error {
  readonly status: number
  readonly errors: readonly JsonApiErrorObject[]
  readonly retryAfterSeconds?: number

  constructor(
    status: number,
    errors: readonly JsonApiErrorObject[],
    retryAfterSeconds?: number,
  ) {
    super(errors[0]?.detail ?? `Request failed with status ${status}.`)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.retryAfterSeconds = retryAfterSeconds
  }

  hasCode(code: string): boolean {
    return this.errors.some((error) => error.code === code)
  }
}

export type NetworkErrorKind = 'timeout' | 'unreachable'

/** The request did not complete, so the outcome on the server is unknown. */
export class NetworkError extends Error {
  readonly kind: NetworkErrorKind

  constructor(kind: NetworkErrorKind, options?: ErrorOptions) {
    super(
      kind === 'timeout'
        ? 'The server took too long to respond.'
        : 'The server could not be reached.',
      options,
    )
    this.name = 'NetworkError'
    this.kind = kind
  }
}

/** The API answered successfully but not with the documented shape. */
export class UnexpectedResponseError extends Error {
  constructor(options?: ErrorOptions) {
    super('The server returned an unexpected response.', options)
    this.name = 'UnexpectedResponseError'
  }
}

const attributePointerPrefix = '/data/attributes/'

/** Maps `/data/attributes/<field>` pointers to their first message; other pointers are left for form-level feedback. */
export function fieldErrorsFrom(error: ApiError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const { pointer, detail } of error.errors) {
    if (pointer?.startsWith(attributePointerPrefix)) {
      fieldErrors[pointer.slice(attributePointerPrefix.length)] ??= detail
    }
  }
  return fieldErrors
}
