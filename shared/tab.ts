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

/** One stopped string. A note holds one of these, a chord holds two or three. */
export const stopSchema = z.object({
  string: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  fret: z.number().int().min(0).max(MAX_FRET),
  /**
   * A semitone above the numbered tsubo. Needed because the tsubo numbering is
   * not chromatic — some neighbours are a whole tone apart, so the note between
   * them has no number of its own and is written as a sharp.
   */
  sharp: z.boolean().default(false),
})

export const eventUnion = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    kind: z.literal('note'),
    /** Struck together. One stop is a single note, more is a chord. */
    stops: z.array(stopSchema).min(1).max(3),
    beam: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
    ornament: z.enum(ORNAMENTS).nullable().default(null),
    /** Suggested left-hand finger, shown as a roman numeral under the note. */
    finger: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .nullable().default(null),
  }),
  z.object({
    id: z.string().min(1),
    /** A rest — drawn as a dot on the sheet. */
    kind: z.literal('rest'),
    beam: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  }),
])

/**
 * Notes used to carry a single `string`/`fret` pair. Tabs written then are
 * still in the database untouched, so widen them on the way in rather than
 * migrating the stored JSON.
 */
function widenLegacyEvent(value: unknown) {
  if (!value || typeof value !== 'object') return value
  const e = value as Record<string, unknown>
  if (e.kind !== 'note' || e.stops !== undefined || e.string === undefined) return value
  const { string, fret, ...rest } = e
  return { ...rest, stops: [{ string, fret, sharp: false }] }
}

export const tabEventSchema = z.preprocess(widenLegacyEvent, eventUnion)

export const barSchema = z.object({
  id: z.string().min(1),
  events: z.array(tabEventSchema).max(64),
})

/** Everything inside a tab that isn't metadata. Stored as jsonb. */
export const tabContentSchema = z.object({
  bars: z.array(barSchema).max(512),
  /** How many bars sit on one line. Defaults to 4, the usual phrase length. */
  barsPerRow: z.number().int().min(1).max(8).default(4),
  /**
   * What the first string is actually tuned to, as a semitone index into
   * NOTE_NAMES. The tuning only fixes the intervals, so this is what turns the
   * tsubo numbers into real pitches. Defaults to B.
   */
  baseSemitone: z.number().int().min(0).max(11).default(11),
})

export type TabEvent = z.infer<typeof tabEventSchema>
export type NoteEvent = Extract<TabEvent, { kind: 'note' }>
export type RestEvent = Extract<TabEvent, { kind: 'rest' }>
export type Bar = z.infer<typeof barSchema>
export type TabContent = z.infer<typeof tabContentSchema>

/**
 * The three standard tunings, as semitone offsets of each string above the
 * first. The absolute pitch varies with the singer, so only the intervals are
 * fixed — `BASE_SEMITONE` just picks a common spelling to show note names in.
 */
export const TUNINGS = [
  {
    id: 'honchoshi',
    name: 'Honchoshi',
    kanji: '\u672c\u8abf\u5b50',
    intervals: '1 \u2013 4 \u2013 8',
    semitones: [0, 5, 12],
    description: 'The default. Third string an octave above the first.',
  },
  {
    id: 'niagari',
    name: 'Niagari',
    kanji: '\u4e8c\u4e0a\u308a',
    intervals: '1 \u2013 5 \u2013 8',
    semitones: [0, 7, 12],
    description: 'Second string raised a tone. Bright, used for lively pieces.',
  },
  {
    id: 'sansagari',
    name: 'Sansagari',
    kanji: '\u4e09\u4e0b\u304c\u308a',
    intervals: '1 \u2013 4 \u2013 \u266d7',
    semitones: [0, 5, 10],
    description: 'Third string lowered a tone. Softer, more melancholy.',
  },
] as const

export const NOTE_NAMES = [
  'C', 'C\u266f', 'D', 'D\u266f', 'E', 'F', 'F\u266f', 'G', 'G\u266f', 'A', 'A\u266f', 'B',
] as const

/** B — the usual reference spelling for the first string. */
export const BASE_SEMITONE = 11

/**
 * Semitones above the open string for a given tsubo number.
 *
 * ASSUMPTION: bunkafu numbers are treated as chromatic positions, so 12 is the
 * octave. Charts do vary between schools — if yours disagrees, this single
 * function is the only place that needs changing.
 */
export function semitonesForTsubo(fret: number) {
  return fret
}

export function noteName(semitonesFromC: number) {
  return NOTE_NAMES[((semitonesFromC % 12) + 12) % 12]
}

/** Note names of the three open strings, low to high. */
export function openStrings(tuningId: string, base = BASE_SEMITONE) {
  const tuning = getTuning(tuningId)
  if (!tuning) return []
  return tuning.semitones.map((s) => noteName(base + s))
}

/**
 * MIDI number of the open first string. `BASE_SEMITONE` is only a pitch class,
 * so playback needs an octave pinned to it — C2 puts honchoshi's first string
 * at B2, which is roughly where a shamisen actually sits.
 */
export const BASE_OCTAVE_MIDI = 36

export function midiAt(
  tuningId: string,
  string: StringNumber,
  fret: number,
  base = BASE_SEMITONE,
) {
  const tuning = getTuning(tuningId)
  if (!tuning) return null
  return BASE_OCTAVE_MIDI + base + tuning.semitones[string - 1]! + semitonesForTsubo(fret)
}

export function frequencyOf(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** The note a given string and tsubo sounds in a given tuning. */
export function pitchAt(
  tuningId: string,
  string: StringNumber,
  fret: number,
  base = BASE_SEMITONE,
) {
  const tuning = getTuning(tuningId)
  if (!tuning) return ''
  return noteName(base + tuning.semitones[string - 1]! + semitonesForTsubo(fret))
}

export type TuningId = (typeof TUNINGS)[number]['id']

export const TUNING_IDS = TUNINGS.map((t) => t.id) as [TuningId, ...TuningId[]]

export function getTuning(id: string) {
  return TUNINGS.find((t) => t.id === id)
}

/** Fresh empty content for a brand-new tab: one bar, waiting for notes. */
export function emptyTabContent(): TabContent {
  return { bars: [{ id: newId(), events: [] }], barsPerRow: 4, baseSemitone: BASE_SEMITONE }
}

/** Line labels, top to bottom: ichi/ni/san no ito. */
export const STRING_LABELS: Record<StringNumber, string> = {
  1: '\u4e00',
  2: '\u4e8c',
  3: '\u4e09',
}

/** Marks drawn beside a note. Kana match what a player writes by hand. */
export const ORNAMENT_GLYPHS: Record<Ornament, string> = {
  'slide-up': '\u2197',
  'slide-down': '\u2198',
  'hajiki': '\u30cf',
  'uchi': '\u30a6',
  'tie': '\u2040',
}

export function newNote(string: StringNumber, fret: number): NoteEvent {
  return {
    id: newId(),
    kind: 'note',
    stops: [{ string, fret, sharp: false }],
    beam: 0,
    ornament: null,
    finger: null,
  }
}

/**
 * Coerce whatever came back from the API into the current shape.
 *
 * The GET endpoint hands back the raw jsonb column without validating it, so
 * this is what stops an older tab from reaching the renderer half-shaped.
 */
export function parseContent(raw: unknown) {
  const parsed = tabContentSchema.safeParse(raw)
  if (parsed.success) return { ok: true as const, content: parsed.data, issue: null }
  // Never hand back a silently-emptied tab: the editor autosaves, so treating
  // unreadable content as "no content" would overwrite the real thing.
  return {
    ok: false as const,
    content: emptyTabContent(),
    issue: parsed.error.issues[0]?.message ?? 'unrecognised content',
  }
}

/** Convenience for read-only callers that have nothing to lose. */
export function normalizeContent(raw: unknown): TabContent {
  return parseContent(raw).content
}

export const FINGERS = [1, 2, 3, 4] as const
export type Finger = (typeof FINGERS)[number]

/** Fingering is written as a roman numeral so it can't be read as a tsubo. */
export const FINGER_NUMERALS: Record<Finger, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV',
}

/**
 * Rhythm is spacing. A 4/4 bar is divided into sixteenth-note slots and each
 * event claims as many as it lasts, so a bar's horizontal layout matches how it
 * is actually counted rather than just listing the notes in order.
 */
export const SLOTS_PER_BAR = 16

/** Bare note = quarter = 4 slots; one underline = eighth = 2; two = sixteenth = 1. */
export const SLOTS_PER_BEAM: Record<0 | 1 | 2, number> = { 0: 4, 1: 2, 2: 1 }

/** The slot a mid-bar line sits on — the start of beat 3. */
export const MID_BAR_SLOT = SLOTS_PER_BAR / 2

export function slotsFor(event: TabEvent) {
  return SLOTS_PER_BEAM[event.beam]
}

/**
 * Where each event starts, and how wide the bar has to be.
 *
 * An over-full bar is laid out at its true length rather than squeezed back
 * into 16 slots — the tab is a record of what you play, not a validator.
 */
export function layOutBar(bar: Bar) {
  let offset = 0
  const items = bar.events.map((event) => {
    const span = slotsFor(event)
    const item = { event, offset, span }
    offset += span
    return item
  })
  return { items, slots: Math.max(SLOTS_PER_BAR, offset), used: offset }
}

export function newRest(): RestEvent {
  return { id: newId(), kind: 'rest', beam: 0 }
}

export function newBar(): Bar {
  return { id: newId(), events: [] }
}

/** Short, collision-safe enough for ids inside a single document. */
export function newId() {
  return Math.random().toString(36).slice(2, 10)
}

/** One thing to sound, at a time, for as long as its slots last. */
export interface ScheduledNote {
  eventId: string
  /** Seconds from the start of the piece. */
  at: number
  /** Seconds the note is held before its natural decay. */
  duration: number
  frequencies: number[]
}

/**
 * Turn a tab into a timed list of pitches.
 *
 * Kept here rather than in the audio composable because it is pure arithmetic —
 * tempo, slots and tuning — and worth being able to check without a speaker.
 */
export function buildSchedule(
  content: TabContent,
  tuningId: string,
  bpm: number,
): { notes: ScheduledNote[], duration: number } {
  const sixteenth = 60 / bpm / 4
  const notes: ScheduledNote[] = []
  let barStart = 0

  for (const bar of content.bars) {
    const { items, slots } = layOutBar(bar)
    for (const { event, offset, span } of items) {
      if (event.kind !== 'note') continue
      const frequencies = event.stops
        .map((st) => {
          const midi = midiAt(tuningId, st.string, st.fret, content.baseSemitone)
          return midi === null ? null : midi + (st.sharp ? 1 : 0)
        })
        .filter((midi): midi is number => midi !== null)
        .map(frequencyOf)
      if (!frequencies.length) continue
      notes.push({
        eventId: event.id,
        at: (barStart + offset) * sixteenth,
        duration: span * sixteenth,
        frequencies,
      })
    }
    // Bars follow one another by their full length, so a half-empty bar still
    // holds its rest of silence instead of pulling the next bar early.
    barStart += slots
  }

  const duration = notes.length
    ? Math.max(...notes.map((n) => n.at + n.duration))
    : 0
  return { notes, duration }
}
