import { z } from 'zod'

/**
 * Validates an API-provided navigation target and reduces it to a path on this site,
 * so callers can pass it to the router without risking an open redirect.
 */
export const sameOriginPathSchema = z.string().transform((href, context) => {
  const path = toSameOriginPath(href)
  if (path === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'The href must stay on this site.',
    })
    return z.NEVER
  }
  return path
})

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
