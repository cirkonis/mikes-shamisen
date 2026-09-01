import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const loginSchema = z.object({
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)

  const expected = process.env.NUXT_APP_PASSWORD
  if (!expected) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_APP_PASSWORD is not configured',
      message: 'NUXT_APP_PASSWORD is not configured',
    })
  }

  // iron (used to seal the session cookie) hard-requires 32+ characters. Check it
  // here so the failure names the actual problem instead of surfacing as a generic
  // 500 from deep inside the seal call, after the password already checked out.
  const sessionPassword = process.env.NUXT_SESSION_PASSWORD ?? ''
  if (sessionPassword.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SESSION_PASSWORD is too short',
      message:
        'NUXT_SESSION_PASSWORD must be at least 32 characters. It is the key that '
        + 'encrypts the session cookie — not the password you type in. Generate one '
        + 'with: openssl rand -base64 32',
    })
  }

  const provided = Buffer.from(body.password)
  const target = Buffer.from(expected)
  const ok =
    provided.length === target.length && timingSafeEqual(provided, target)

  if (!ok) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid password',
    })
  }

  await setUserSession(event, {
    user: { loggedIn: true },
    loggedInAt: Date.now(),
  })

  return { ok: true }
})
