import { z } from 'zod'

import {
  ApiError,
  NetworkError,
  UnexpectedResponseError,
  type JsonApiErrorObject,
} from './apiErrors'

// The API rejects media type parameters such as `charset` with 415.
export const jsonApiMediaType = 'application/vnd.api+json'

const defaultTimeoutMs = 15_000
const csrfCookieName = 'XSRF-TOKEN'
const csrfHeaderName = 'X-XSRF-TOKEN'

export interface JsonApiRequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Expected response document; a mismatch raises UnexpectedResponseError. */
  schema?: z.ZodType<T>
  /** Cancels the request, e.g. a route loader's `request.signal`. */
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * Sends a same-origin JSON:API request with the session cookie and, for writes, the CSRF token.
 * Resolves with the validated document, or `undefined` when the response has no body.
 */
export async function requestJsonApi<T>(
  path: string,
  {
    method = 'GET',
    body,
    schema,
    signal,
    timeoutMs = defaultTimeoutMs,
  }: JsonApiRequestOptions<T> = {},
): Promise<T | undefined> {
  const response = await send(path, {
    method,
    headers: requestHeaders(method, body),
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    signal: withTimeout(signal, timeoutMs),
  })

  if (!response.ok) {
    throw await apiErrorFrom(response)
  }

  const text = await response.text()
  if (!schema || text === '') {
    return undefined
  }
  const result = schema.safeParse(parseJson(text))
  if (!result.success) {
    throw new UnexpectedResponseError({ cause: result.error })
  }
  return result.data
}

/** Same as `requestJsonApi`, for operations whose contract always returns a document on success. */
export async function requestJsonApiDocument<T>(
  path: string,
  options: JsonApiRequestOptions<T> & { schema: z.ZodType<T> },
): Promise<T> {
  const document = await requestJsonApi(path, options)
  if (document === undefined) {
    throw new UnexpectedResponseError()
  }
  return document
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init)
  } catch (error) {
    if (errorName(error) === 'AbortError') {
      throw error
    }
    throw new NetworkError(
      errorName(error) === 'TimeoutError' ? 'timeout' : 'unreachable',
      { cause: error },
    )
  }
}

// Compares names rather than `instanceof DOMException`, which fails when fetch and the page use different realms.
function errorName(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'name' in error
    ? String(error.name)
    : undefined
}

function requestHeaders(method: string, body: unknown): Headers {
  const headers = new Headers({ Accept: jsonApiMediaType })
  if (body !== undefined) {
    headers.set('Content-Type', jsonApiMediaType)
  }
  const csrfToken = method === 'GET' ? undefined : readCookie(csrfCookieName)
  if (csrfToken) {
    headers.set(csrfHeaderName, csrfToken)
  }
  return headers
}

function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix))
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new UnexpectedResponseError({ cause: error })
  }
}

const errorDocumentSchema = z.object({
  errors: z.array(
    z.object({
      status: z.string(),
      code: z.string(),
      title: z.string(),
      detail: z.string(),
      source: z.object({ pointer: z.string() }).optional(),
    }),
  ),
})

async function apiErrorFrom(response: Response): Promise<ApiError> {
  return new ApiError(
    response.status,
    await errorObjectsFrom(response),
    retryAfterSeconds(response.headers.get('Retry-After')),
  )
}

// Non-JSON:API error bodies keep the status with no error objects, e.g. the dev proxy's empty 502 when the backend is down.
async function errorObjectsFrom(
  response: Response,
): Promise<JsonApiErrorObject[]> {
  try {
    const document = errorDocumentSchema.safeParse(await response.json())
    return document.success
      ? document.data.errors.map(({ source, ...error }) => ({
          ...error,
          pointer: source?.pointer,
        }))
      : []
  } catch {
    return []
  }
}

function retryAfterSeconds(header: string | null): number | undefined {
  const seconds = Number(header)
  return header && Number.isInteger(seconds) && seconds > 0
    ? seconds
    : undefined
}
