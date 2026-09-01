import { z } from 'zod'
import { tabContentSchema, TUNING_IDS } from '#shared/tab'

export const createTabSchema = z.object({
  title: z.string().trim().min(1).max(160),
  artist: z.string().trim().max(160).nullable().optional(),
  tuning: z.enum(TUNING_IDS).default('honchoshi'),
  notes: z.string().trim().max(4000).nullable().optional(),
  content: tabContentSchema.optional(),
})

export const updateTabSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  artist: z.string().trim().max(160).nullable().optional(),
  tuning: z.enum(TUNING_IDS).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  content: tabContentSchema.optional(),
})
