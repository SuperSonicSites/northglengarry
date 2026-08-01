/**
 * Access gate for the dashboard.
 *
 * Functional requirement 1 is private access: the sponsor plus, optionally, a
 * small invited circle. This runs as Cloudflare Pages middleware in front of
 * every request, including static assets, so there is no path that serves the
 * dashboard unauthenticated.
 *
 * Configure in the Cloudflare dashboard under Settings → Variables and Secrets,
 * for both Production and Preview:
 *
 *   DASHBOARD_USER      the username
 *   DASHBOARD_PASSWORD  the password, stored as a Secret (encrypted)
 *
 * The gate fails closed. If the variables are absent the site returns 503
 * rather than serving, because a private dashboard that quietly becomes public
 * when a variable is missing is worse than one that is briefly unavailable.
 *
 * HTTP Basic authentication is deliberate here: it is one shared credential for
 * a handful of trusted readers on a private preparation instrument, and it adds
 * no accounts to administer. If access ever needs to be per-person, revocable,
 * or audited — which is the right answer if the circle grows or a public view
 * is ever contemplated — replace this with Cloudflare Access, which puts an
 * identity provider in front of the same origin and leaves this file unused.
 */

const REALM = 'North Glengarry Stewardship Dashboard'

export async function onRequest(context) {
  const { request, env, next } = context

  const expectedUser = env.DASHBOARD_USER
  const expectedPassword = env.DASHBOARD_PASSWORD

  if (!expectedUser || !expectedPassword) {
    return new Response(
      'Access is not configured. Set DASHBOARD_USER and DASHBOARD_PASSWORD in the ' +
        'Cloudflare Pages project settings, then redeploy.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }

  const header = request.headers.get('Authorization') || ''
  const [scheme, encoded] = header.split(' ')

  if (scheme !== 'Basic' || !encoded) {
    return challenge()
  }

  let decoded
  try {
    decoded = atob(encoded)
  } catch {
    return challenge()
  }

  // Only the first colon separates the two: passwords may contain colons.
  const separator = decoded.indexOf(':')
  if (separator < 0) return challenge()

  const user = decoded.slice(0, separator)
  const password = decoded.slice(separator + 1)

  // Compare both fields before returning, so the response time does not reveal
  // whether the username alone was correct.
  const userOk = timingSafeEqual(user, expectedUser)
  const passwordOk = timingSafeEqual(password, expectedPassword)
  if (!userOk || !passwordOk) return challenge()

  const response = await next()
  const headers = new Headers(response.headers)
  // Authenticated content must never be held in a shared cache.
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function challenge() {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'content-type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Constant-time comparison over the UTF-8 bytes. Length is compared first and
 * unequal lengths short-circuit — that leaks the length of the secret, which is
 * not material here, and avoids a variable-time allocation.
 */
function timingSafeEqual(a, b) {
  const encoder = new TextEncoder()
  const bytesA = encoder.encode(a)
  const bytesB = encoder.encode(b)
  if (bytesA.length !== bytesB.length) return false
  let diff = 0
  for (let i = 0; i < bytesA.length; i += 1) {
    diff |= bytesA[i] ^ bytesB[i]
  }
  return diff === 0
}
