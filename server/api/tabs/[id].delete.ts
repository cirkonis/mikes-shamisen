import { eq } from 'drizzle-orm'
import { useDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  await db.delete(schema.tabs).where(eq(schema.tabs.id, id))

  return { ok: true }
})
