import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core'
import type { TabContent } from '#shared/tab'

export const tabs = pgTable('tabs', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  /** Composer / school / where it came from. Free text, optional. */
  artist: text('artist'),
  /** One of TUNING_IDS. Stored as text so adding a tuning needs no migration. */
  tuning: text('tuning').notNull().default('honchoshi'),
  notes: text('notes'),
  /** The bars themselves — see shared/tab.ts for the shape. */
  content: jsonb('content').$type<TabContent>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tab = typeof tabs.$inferSelect
export type NewTab = typeof tabs.$inferInsert
