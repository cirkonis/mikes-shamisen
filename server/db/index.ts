import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import { resolveDatabaseUrl, KNOWN_URL_VARS } from './resolve-url'

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (cached) return cached
  const url = resolveDatabaseUrl()
  if (!url) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'No Postgres connection string found in the environment. Checked '
        + `${KNOWN_URL_VARS.join(', ')}, plus any *_URL variable holding a `
        + 'postgres:// value (Vercel lets the Neon integration add a custom prefix).',
    })
  }
  const sql = neon(url)
  cached = drizzle(sql, { schema })
  return cached
}

export { schema }
