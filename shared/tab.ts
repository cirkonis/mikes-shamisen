import { z } from 'zod'

/**
 * The shamisen tab document model.
 *
 * Notation is bunkafu (文化譜): three horizontal lines, one per string, with a
 * number on a line giving the position (tsubo) to stop. Everything is assumed
 * to be in 4/4 — we deliberately do not model durations as a timing system.
 * Instead a note carries the marks a player actually writes on the page:
 * underlines for subdivision and an ornament for slides/plucks.
 */

/** 1 = ichi no ito (thickest / lowest) … 3 = san no ito (thinnest / highest). */
export const STRINGS = [1, 2, 3] as const
export type StringNumber = (typeof STRINGS)[number]

/** Highest tsubo we offer in the picker. Bunkafu charts run 0–20. */
export const MAX_FRET = 20

/**
 * Underlines beneath a note, the bunkafu subdivision mark.
 * 0 = bare (quarter), 1 = single underline (eighth), 2 = double (sixteenth).
 */
export const BEAMS = [0, 1, 2] as const
export type Beam = (typeof BEAMS)[number]

/** The squiggles and hooks written next to a note. */
export const ORNAMENTS = [
  'slide-up',   // スリ upward — curvy arrow rising into the note
  'slide-down', // スリ downward
  'hajiki',     // ハジキ — left-hand pluck
  'uchi',       // ウチ — hammer-on
  'tie',        // slur / held into the next note
] as const
export type Ornament = (typeof ORNAMENTS)[number]

export const ORNAMENT_LABELS: Record<Ornament, string> = {
  'slide-up': 'Slide up (suri)',
  'slide-down': 'Slide down (suri)',
  'hajiki': 'Hajiki (left-hand pluck)',
  'uchi': 'Uchi (hammer-on)',
  'tie': 'Tie / slur',
}

export const tabEventSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    kind: z.literal('note'),
    string: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    fret: z.number().int().min(0).max(MAX_FRET),
    beam: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
    ornament: z.enum(ORNAMENTS).nullable().default(null),
  }),
  z.object({
    id: z.string().min(1),
    /** A rest — drawn as a dot on the sheet. */
    kind: z.literal('rest'),
    beam: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  }),
])

export const barSchema = z.object({
  id: z.string().min(1),
  events: z.array(tabEventSchema).max(64),
})

/** Everything inside a tab that isn't metadata. Stored as jsonb. */
export const tabContentSchema = z.object({
  bars: z.array(barSchema).max(512),
})

export type TabEvent = z.infer<typeof tabEventSchema>
export type NoteEvent = Extract<TabEvent, { kind: 'note' }>
export type RestEvent = Extract<TabEvent, { kind: 'rest' }>
export type Bar = z.infer<typeof barSchema>
export type TabContent = z.infer<typeof tabContentSchema>

/**
 * The three standard tunings. `intervals` is what actually matters — the
 * absolute pitches vary with the singer, so `pitches` is only a common
 * reference spelling.
 */
export const TUNINGS = [
  {
    id: 'honchoshi',
    name: 'Honchoshi',
    kanji: '本調子',
    intervals: '1 – 4 – 8',
    pitches: ['B', 'E', 'B'],
    description: 'The default. Third string an octave above the first.',
  },
  {
    id: 'niagari',
    name: 'Niagari',
    kanji: '二上り',
    intervals: '1 – 5 – 8',
    pitches: ['B', 'F#', 'B'],
    description: 'Second string raised a tone. Bright, used for lively pieces.',
  },
  {
    id: 'sansagari',
    name: 'Sansagari',
    kanji: '三下り',
    intervals: '1 – 4 – ♭7',
    pitches: ['B', 'E', 'A'],
    description: 'Third string lowered a tone. Softer, more melancholy.',
  },
] as const

export type TuningId = (typeof TUNINGS)[number]['id']

export const TUNING_IDS = TUNINGS.map((t) => t.id) as [TuningId, ...TuningId[]]

export function getTuning(id: string) {
  return TUNINGS.find((t) => t.id === id)
}

/** Fresh empty content for a brand-new tab: one bar, waiting for notes. */
export function emptyTabContent(): TabContent {
  return { bars: [{ id: newId(), events: [] }] }
}

/** Short, collision-safe enough for ids inside a single document. */
export function newId() {
  return Math.random().toString(36).slice(2, 10)
}
