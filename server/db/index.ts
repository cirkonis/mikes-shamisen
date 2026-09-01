import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (cached) return cached
  const url = process.env.POSTGRES_URL
  if (!url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'POSTGRES_URL is not configured',
    })
  }
  const sql = neon(url)
  cached = drizzle(sql, { schema })
  return cached
}

export { schema }
