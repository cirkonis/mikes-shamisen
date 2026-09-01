import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit doesn't read dotenv files at all — load them ourselves.
// .env.local holds the Neon vars (written by `vercel env pull .env.local`).
for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file)
}

const url =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  ''

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
