import { useDb, schema } from '~~/server/db'
import { createTabSchema } from '~~/server/db/validators'
import { emptyTabContent } from '#shared/tab'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const body = await readValidatedBody(event, createTabSchema.parse)
  const db = useDb()

  const [tab] = await db
    .insert(schema.tabs)
    .values({
      title: body.title,
      artist: body.artist ?? null,
      tuning: body.tuning,
      notes: body.notes ?? null,
      content: body.content ?? emptyTabContent(),
    })
    .returning()

  return tab
})
