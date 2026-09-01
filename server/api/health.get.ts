import { sql } from 'drizzle-orm'
import { useDb } from '~~/server/db'

/**
 * Config diagnostic for "works locally, fails on Vercel" problems.
 *
 * Reports only whether each variable is *present* and whether a trivial query
 * succeeds — never the values, since connection strings carry credentials.
 * Auth-gated so it isn't a public map of the deployment.
 */
export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const present = (name: string) => Boolean(process.env[name]?.length)

  const env = {
    POSTGRES_URL: present('POSTGRES_URL'),
    POSTGRES_URL_NON_POOLING: present('POSTGRES_URL_NON_POOLING'),
    DATABASE_URL: present('DATABASE_URL'),
    NUXT_SESSION_PASSWORD: present('NUXT_SESSION_PASSWORD'),
    NUXT_APP_PASSWORD: present('NUXT_APP_PASSWORD'),
  }

  let canQuery = false
  let dbError: string | null = null
  let tabCount: number | null = null

  try {
    const db = useDb()
    const rows = await db.execute(sql`select count(*)::int as count from tabs`)
    tabCount = (rows.rows?.[0] as { count?: number } | undefined)?.count ?? null
    canQuery = true
  } catch (e) {
    // Scrub anything URL-shaped: driver errors sometimes echo the DSN back.
    dbError = String((e as Error)?.message ?? e)
      .replace(/postgres(ql)?:\/\/[^\s"']+/gi, '<connection-string-redacted>')
      .slice(0, 300)
  }

  return { env, canQuery, tabCount, dbError, runtime: process.env.VERCEL ? 'vercel' : 'local' }
})
