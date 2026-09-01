import { eq } from 'drizzle-orm'
import { useDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [tab] = await db
    .select()
    .from(schema.tabs)
    .where(eq(schema.tabs.id, id))
    .limit(1)

  if (!tab) {
    throw createError({ statusCode: 404, statusMessage: 'Tab not found' })
  }

  return tab
})
