<script setup lang="ts">
import type { Bar, StringNumber, TabEvent } from '#shared/tab'
import {
  ACCIDENTAL_GLYPHS, FINGER_NUMERALS, ORNAMENT_GLYPHS, STRING_LABELS,
  layOutBar, midBarSlot, slotsPerBar,
} from '#shared/tab'

const props = withDefaults(defineProps<{
  bars: Bar[]
  /** Which event is currently being edited, if any. */
  selectedEventId?: string | null
  /** Which bar new events get added to. */
  activeBarId?: string | null
  /** Where in the active bar the next event lands. */
  insertIndex?: number | null
  /** Bars per line. */
  barsPerRow?: number
  /** Quarter-note beats in a bar — 4 for 4/4, 2 for 2/4. */
  beatsPerBar?: number
  /** The note currently sounding during playback. */
  playingEventId?: string | null
  interactive?: boolean
}>(), {
  selectedEventId: null,
  activeBarId: null,
  insertIndex: null,
  barsPerRow: 4,
  beatsPerBar: 4,
  playingEventId: null,
  interactive: false,
})

const emit = defineEmits<{
  selectBar: [barId: string]
  selectEvent: [barId: string, eventId: string]
  insertAt: [barId: string, index: number]
}>()

/**
 * Vertical position of each string's line, in px from the top of a bar.
 *
 * The thick first string is the BOTTOM line, as it is written in bunkafu — the
 * lines run low-to-high upward, the opposite of how they are numbered.
 */
const LINE_Y: Record<StringNumber, number> = { 1: 72, 2: 48, 3: 24 }

/**
 * Derived rather than written out, so anything spanning the staff keeps working
 * if the line order is ever flipped again — the beat line broke exactly this way.
 */
const TOP_LINE = Math.min(...Object.values(LINE_Y))
const BOTTOM_LINE = Math.max(...Object.values(LINE_Y))
const STAFF_HEIGHT = 112

/** Enough room for a two-digit tsubo in a single sixteenth slot. */
const MIN_SLOT_PX = 17

/**
 * Underlines are a fixed tick under the number, never the width of the note's
 * slot span. Scaling them with duration draws a *longer* line for a *shorter*
 * note, which reads as exactly the wrong thing.
 */
const UNDERLINE_PX = 13

function isNote(e: TabEvent): e is Extract<TabEvent, { kind: 'note' }> {
  return e.kind === 'note'
}

function stopYs(e: TabEvent) {
  return isNote(e) ? e.stops.map((st) => LINE_Y[st.string]) : [LINE_Y[2]]
}

/** Marks hang off the outside of a chord, not off one arbitrary member of it. */
function topY(e: TabEvent) {
  return Math.min(...stopYs(e))
}

function bottomY(e: TabEvent) {
  return Math.max(...stopYs(e))
}

/** One layout pass per bar, rather than recomputing it per mark in the template. */
const layouts = computed(() => {
  const map = new Map<string, ReturnType<typeof layOutBar>>()
  for (const bar of props.bars) map.set(bar.id, layOutBar(bar, props.beatsPerBar))
  return map
})

function lay(bar: Bar) {
  return layouts.value.get(bar.id)!
}

/** Slot offsets become percentages so a bar scales with whatever width it gets. */
function pct(slot: number, total: number) {
  return `${(slot / total) * 100}%`
}
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <div
      v-for="(bar, barIndex) in bars"
      :key="bar.id"
      class="bg-sheet relative rounded-lg border transition-colors"
      :style="{
        flexBasis: `calc(${(lay(bar).slots / slotsPerBar(beatsPerBar)) * (100 / barsPerRow)}% - 0.75rem)`,
        minWidth: `${lay(bar).slots * MIN_SLOT_PX}px`,
      }"
      :class="[
        interactive && activeBarId === bar.id ? 'border-primary ring-primary/25 ring-2' : 'border-border',
        interactive ? 'cursor-pointer' : '',
      ]"
      @click="interactive && emit('selectBar', bar.id)"
    >
      <span class="text-muted-foreground bg-sheet absolute -top-2 left-2 px-1 text-[10px] font-medium">
        {{ barIndex + 1 }}
      </span>

      <div class="relative px-2 py-2" :style="{ height: `${STAFF_HEIGHT}px` }">
        <span
          v-for="s in ([1, 2, 3] as StringNumber[])"
          :key="`label-${s}`"
          class="text-muted-foreground pointer-events-none absolute left-0 -translate-y-1/2 text-[9px]"
          :style="{ top: `${LINE_Y[s]}px` }"
        >{{ STRING_LABELS[s] }}</span>

        <!-- The staff itself, one slot-grid wide -->
        <div class="relative ml-3 h-full">
          <div
            v-for="s in ([1, 2, 3] as StringNumber[])"
            :key="s"
            class="bg-sheet-line pointer-events-none absolute inset-x-0 h-px"
            :style="{ top: `${LINE_Y[s]}px` }"
          />

          <!-- Beat 3: the halfway point of the bar -->
          <div
            class="bg-sheet-line/60 pointer-events-none absolute w-px"
            :style="{
              left: pct(midBarSlot(beatsPerBar), lay(bar).slots),
              top: `${TOP_LINE}px`,
              height: `${BOTTOM_LINE - TOP_LINE}px`,
            }"
          />

          <template v-for="item in lay(bar).items" :key="item.event.id">
            <!-- Each event occupies exactly the width of its duration -->
            <button
              type="button"
              :disabled="!interactive"
              class="absolute top-0 rounded transition-colors"
              :class="[
                interactive ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default',
                selectedEventId === item.event.id ? 'bg-primary/15 ring-primary ring-1' : '',
                playingEventId === item.event.id ? 'bg-primary/25' : '',
              ]"
              :style="{
                left: pct(item.offset, lay(bar).slots),
                width: pct(item.span, lay(bar).slots),
                height: `${STAFF_HEIGHT - 16}px`,
              }"
              @click.stop="interactive && emit('selectEvent', bar.id, item.event.id)"
            >
              <span
                v-if="isNote(item.event) && item.event.ornament"
                class="text-primary absolute left-0 text-[11px] leading-none"
                :style="{ top: `${topY(item.event) - 20}px` }"
              >{{ ORNAMENT_GLYPHS[item.event.ornament] }}</span>

              <!-- Notes sit at the start of their slot, so the beat lands on them -->
              <template v-if="isNote(item.event)">
                <span
                  v-for="stop in item.event.stops"
                  :key="stop.string"
                  class="bg-sheet text-sheet-ink absolute left-0 -translate-y-1/2 px-0.5 font-tab text-[13px] leading-none"
                  :style="{ top: `${LINE_Y[stop.string]}px` }"
                >{{ stop.fret }}<span
                  v-if="stop.accidental"
                  class="text-primary align-super text-[9px] leading-none"
                >{{ ACCIDENTAL_GLYPHS[stop.accidental] }}</span></span>
              </template>
              <span
                v-else
                class="bg-sheet text-sheet-ink absolute left-0 -translate-y-1/2 px-0.5 font-tab text-[13px] leading-none"
                :style="{ top: `${LINE_Y[2]}px` }"
              >•</span>

              <span
                v-for="n in item.event.beam"
                :key="n"
                class="bg-sheet-ink absolute left-0.5 h-px"
                :style="{
                  top: `${bottomY(item.event) + 8 + n * 3}px`,
                  width: `${UNDERLINE_PX}px`,
                }"
              />

              <span
                v-if="isNote(item.event) && item.event.finger"
                class="text-muted-foreground absolute left-0.5 text-[9px] leading-none"
                :style="{ top: `${bottomY(item.event) + 20}px` }"
              >{{ FINGER_NUMERALS[item.event.finger] }}</span>
            </button>

            <!-- Caret target on this event's leading edge -->
            <button
              v-if="interactive"
              type="button"
              class="group/gap absolute top-0 z-10 w-1.5 -translate-x-1/2 cursor-pointer"
              :style="{
                left: pct(item.offset, lay(bar).slots),
                height: `${STAFF_HEIGHT - 16}px`,
              }"
              :aria-label="`Insert before position ${item.offset + 1}`"
              @click.stop="emit('insertAt', bar.id, lay(bar).items.indexOf(item))"
            >
              <span
                class="absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors"
                :class="activeBarId === bar.id && insertIndex === lay(bar).items.indexOf(item)
                  ? 'bg-primary'
                  : 'bg-transparent group-hover/gap:bg-primary/40'"
              />
            </button>
          </template>

          <!-- Caret after the last note -->
          <button
            v-if="interactive && bar.events.length"
            type="button"
            class="group/gap absolute top-0 z-10 w-1.5 -translate-x-1/2 cursor-pointer"
            :style="{
              left: pct(lay(bar).used, lay(bar).slots),
              height: `${STAFF_HEIGHT - 16}px`,
            }"
            aria-label="Insert at the end"
            @click.stop="emit('insertAt', bar.id, bar.events.length)"
          >
            <span
              class="absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors"
              :class="activeBarId === bar.id && insertIndex === bar.events.length
                ? 'bg-primary'
                : 'bg-transparent group-hover/gap:bg-primary/40'"
            />
          </button>

          <p
            v-if="!bar.events.length"
            class="text-muted-foreground/70 pointer-events-none absolute inset-0 grid place-items-center text-xs"
          >
            {{ interactive ? 'empty' : '' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
