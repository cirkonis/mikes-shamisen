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
