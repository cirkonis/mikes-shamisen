import { desc } from 'drizzle-orm'
import { useDb, schema } from '~~/server/db'

/** Library listing — deliberately omits `content`, which can be large. */
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const db = useDb()

  return db
    .select({
      id: schema.tabs.id,
      title: schema.tabs.title,
      artist: schema.tabs.artist,
      tuning: schema.tabs.tuning,
      updatedAt: schema.tabs.updatedAt,
    })
    .from(schema.tabs)
    .orderBy(desc(schema.tabs.updatedAt))
})
