import { eq } from 'drizzle-orm'
import { useDb, schema } from '~~/server/db'
import { updateTabSchema } from '~~/server/db/validators'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateTabSchema.parse)
  const db = useDb()

  const [tab] = await db
    .update(schema.tabs)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.tabs.id, id))
    .returning()

  if (!tab) {
    throw createError({ statusCode: 404, statusMessage: 'Tab not found' })
  }

  return tab
})
