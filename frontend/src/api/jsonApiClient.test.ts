import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { server } from '../test/server'

import { ApiError, NetworkError, UnexpectedResponseError } from './apiErrors'
import { jsonApiMediaType, requestJsonApi } from './jsonApiClient'

const path = '/api/v1/examples'
const exampleSchema = z.object({ data: z.object({ id: z.string() }) })

function setCookie(cookie: string) {
  document.cookie = cookie
}

afterEach(() => {
  setCookie('XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT')
})

describe('requestJsonApi', () => {
  it('sends a JSON:API document and returns the validated response', async () => {
    let request: Request | undefined
    server.use(
      http.post(path, ({ request: received }) => {
        request = received
        return HttpResponse.json(
          { data: { id: '42' } },
          { status: 201, headers: { 'Content-Type': jsonApiMediaType } },
        )
      }),
    )

    const document = await requestJsonApi(path, {
      method: 'POST',
      body: { data: { type: 'examples' } },
      schema: exampleSchema,
    })

    expect(document).toEqual({ data: { id: '42' } })
    expect(request?.headers.get('Accept')).toBe(jsonApiMediaType)
    expect(request?.headers.get('Content-Type')).toBe(jsonApiMediaType)
    expect(await request?.json()).toEqual({ data: { type: 'examples' } })
  })

  it('sends the CSRF token on writes but not on reads', async () => {
    setCookie('XSRF-TOKEN=csrf-123')
    const tokens: (string | null)[] = []
    server.use(
      http.all(path, ({ request }) => {
        tokens.push(request.headers.get('X-XSRF-TOKEN'))
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await requestJsonApi(path)
    await requestJsonApi(path, { method: 'PATCH', body: {} })

    expect(tokens).toEqual([null, 'csrf-123'])
  })

  it('resolves with undefined when the response has no body', async () => {
    server.use(http.get(path, () => new HttpResponse(null, { status: 204 })))

    await expect(
      requestJsonApi(path, { schema: exampleSchema }),
    ).resolves.toBeUndefined()
  })

  it('raises an ApiError with error objects and Retry-After', async () => {
    server.use(
      http.post(path, () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '429',
                code: 'rate-limited',
                title: 'Too many requests',
                detail: 'Too many attempts. Try again later.',
              },
            ],
          },
          { status: 429, headers: { 'Retry-After': '120' } },
        ),
      ),
    )

    const error = await requestJsonApi(path, { method: 'POST' }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 429,
      retryAfterSeconds: 120,
      errors: [{ code: 'rate-limited' }],
    })
  })

  it('keeps field pointers from validation errors', async () => {
    server.use(
      http.post(path, () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '400',
                code: 'validation-failed',
                title: 'Invalid attribute',
                detail: 'Enter a valid email address.',
                source: { pointer: '/data/attributes/email' },
              },
            ],
          },
          { status: 400 },
        ),
      ),
    )

    await expect(
      requestJsonApi(path, { method: 'POST' }),
    ).rejects.toMatchObject({
      errors: [{ pointer: '/data/attributes/email' }],
    })
  })

  it('keeps the status when the dev proxy cannot reach the backend', async () => {
    server.use(
      http.get(
        path,
        () =>
          new HttpResponse(null, {
            status: 502,
            headers: { 'Content-Type': 'text/plain' },
          }),
      ),
    )

    await expect(requestJsonApi(path)).rejects.toMatchObject({
      status: 502,
      errors: [],
    })
  })

  it('raises a NetworkError when the server cannot be reached', async () => {
    server.use(http.get(path, () => HttpResponse.error()))

    const error = await requestJsonApi(path).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(NetworkError)
    expect(error).toMatchObject({ kind: 'unreachable' })
  })

  it('raises a timeout NetworkError when the server does not answer in time', async () => {
    server.use(
      http.get(path, async () => {
        await delay('infinite')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const error = await requestJsonApi(path, { timeoutMs: 50 }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(NetworkError)
    expect(error).toMatchObject({ kind: 'timeout' })
  })

  it('lets a caller abort without reporting a network failure', async () => {
    server.use(
      http.get(path, async () => {
        await delay('infinite')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const controller = new AbortController()

    const request = requestJsonApi(path, { signal: controller.signal })
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('raises an UnexpectedResponseError when the document does not match', async () => {
    server.use(http.get(path, () => HttpResponse.json({ data: { id: 42 } })))

    await expect(
      requestJsonApi(path, { schema: exampleSchema }),
    ).rejects.toBeInstanceOf(UnexpectedResponseError)
  })
})
