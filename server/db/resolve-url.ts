/** The names Vercel/Neon use when no custom prefix is configured. */
export const KNOWN_URL_VARS = [
  'POSTGRES_URL',
  'DATABASE_URL',
] as const

/** Names that point at a database but are unsuitable as the app's pooled client. */
const UNSUITABLE = /NON_POOLING|UNPOOLED|NO_SSL|PRISMA/

/**
 * Every env var whose *value* is a postgres DSN.
 *
 * Matching on the value rather than the name matters: a custom prefix produces
 * names like STORAGE_URL_NON_POOLING, which a name-based `_URL` suffix test
 * silently misses.
 */
function postgresEnvEntries(): [string, string][] {
  return Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && /^postgres(ql)?:\/\//i.test(entry[1]),
  )
}

/**
 * Find the connection string.
 *
 * Vercel's storage integration can be connected with a "Custom Environment
 * Variable Prefix", which renames POSTGRES_URL to e.g. STORAGE_URL. Rather than
 * hardcode a guess, fall back to scanning for any *_URL variable whose value is
 * actually a postgres DSN, preferring a pooled one.
 */
export function resolveDatabaseUrl(): string | undefined {
  for (const name of KNOWN_URL_VARS) {
    const value = process.env[name]
    if (value) return value
  }

  const candidates = postgresEnvEntries()

  const pooled = candidates.find(([name]) => !UNSUITABLE.test(name))
  return (pooled ?? candidates[0])?.[1]
}

/** Names only — for the /api/health diagnostic. Never returns values. */
export function describeDatabaseEnv() {
  return {
    known: Object.fromEntries(
      KNOWN_URL_VARS.map((n) => [n, Boolean(process.env[n]?.length)]),
    ),
    postgresUrlVarsFound: postgresEnvEntries().map(([name]) => name),
    resolved: Boolean(resolveDatabaseUrl()),
  }
}
