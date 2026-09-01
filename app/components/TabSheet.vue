<script setup lang="ts">
import type { Bar, StringNumber, TabEvent } from '#shared/tab'
import { ORNAMENT_GLYPHS, STRING_LABELS } from '#shared/tab'

const props = withDefaults(defineProps<{
  bars: Bar[]
  /** Which event is currently being edited, if any. */
  selectedEventId?: string | null
  /** Which bar new events get added to. */
  activeBarId?: string | null
  /** Where in the active bar the next event lands. */
  insertIndex?: number | null
  interactive?: boolean
}>(), {
  selectedEventId: null,
  activeBarId: null,
  insertIndex: null,
  interactive: false,
})

const emit = defineEmits<{
  selectBar: [barId: string]
  selectEvent: [barId: string, eventId: string]
  insertAt: [barId: string, index: number]
}>()

/** Vertical position of each string's line, in px from the top of a bar. */
const LINE_Y: Record<StringNumber, number> = { 1: 18, 2: 42, 3: 66 }
const STAFF_HEIGHT = 96

function isNote(e: TabEvent): e is Extract<TabEvent, { kind: 'note' }> {
  return e.kind === 'note'
}

/** A rest sits on the middle line — it belongs to no single string. */
function yFor(e: TabEvent) {
  return isNote(e) ? LINE_Y[e.string] : LINE_Y[2]
}

function onEventClick(barId: string, eventId: string) {
  if (!props.interactive) return
  emit('selectEvent', barId, eventId)
}
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <div
      v-for="(bar, barIndex) in bars"
      :key="bar.id"
      class="bg-sheet relative min-w-36 rounded-lg border transition-colors"
      :class="[
        interactive && activeBarId === bar.id ? 'border-primary ring-primary/25 ring-2' : 'border-border',
        interactive ? 'cursor-pointer' : '',
      ]"
      @click="interactive && emit('selectBar', bar.id)"
    >
      <!-- Bar number, printed outside the staff like a real sheet -->
      <span class="text-muted-foreground absolute -top-2 left-2 bg-sheet px-1 text-[10px] font-medium">
        {{ barIndex + 1 }}
      </span>

      <div class="relative px-3 py-2" :style="{ height: `${STAFF_HEIGHT}px` }">
        <!-- The three string lines -->
        <div
          v-for="s in ([1, 2, 3] as StringNumber[])"
          :key="s"
          class="bg-sheet-line pointer-events-none absolute right-3 left-3 h-px"
          :style="{ top: `${LINE_Y[s]}px` }"
        />
        <!-- Line labels, so top vs bottom is never ambiguous -->
        <span
          v-for="s in ([1, 2, 3] as StringNumber[])"
          :key="`label-${s}`"
          class="text-muted-foreground pointer-events-none absolute left-0 -translate-y-1/2 text-[9px]"
          :style="{ top: `${LINE_Y[s]}px` }"
        >{{ STRING_LABELS[s] }}</span>

        <div class="relative flex h-full items-start gap-1 pl-3">
          <!-- An empty bar still needs to be clickable and to look intentional -->
          <p
            v-if="!bar.events.length"
            class="text-muted-foreground/70 absolute inset-0 grid place-items-center text-xs"
          >
            {{ interactive ? 'empty' : '' }}
          </p>

          <template v-for="(event, i) in bar.events" :key="event.id">
            <!-- Click between notes to put the caret there -->
            <button
              v-if="interactive"
              type="button"
              class="group/gap relative w-2 shrink-0 cursor-pointer"
              :style="{ height: `${STAFF_HEIGHT - 16}px` }"
              :aria-label="`Insert at position ${i + 1}`"
              @click.stop="emit('insertAt', bar.id, i)"
            >
              <span
                class="absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors"
                :class="activeBarId === bar.id && insertIndex === i
                  ? 'bg-primary'
                  : 'bg-transparent group-hover/gap:bg-primary/40'"
              />
            </button>

          <button
            type="button"
            :disabled="!interactive"
            class="relative w-8 shrink-0 rounded transition-colors"
            :class="[
              interactive ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default',
              selectedEventId === event.id ? 'bg-primary/15 ring-primary ring-1' : '',
            ]"
            :style="{ height: `${STAFF_HEIGHT - 16}px` }"
            @click.stop="onEventClick(bar.id, event.id)"
          >
            <!-- Ornament sits above the number, the way it is written by hand -->
            <span
              v-if="isNote(event) && event.ornament"
              class="text-primary absolute left-1/2 -translate-x-1/2 text-[11px] leading-none"
              :style="{ top: `${yFor(event) - 20}px` }"
            >{{ ORNAMENT_GLYPHS[event.ornament] }}</span>

            <!-- The number (or the rest's dot), painted over the line -->
            <span
              class="bg-sheet text-sheet-ink absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 font-tab text-sm leading-none"
              :style="{ top: `${yFor(event)}px` }"
            >{{ isNote(event) ? event.fret : '•' }}</span>

            <!-- Underlines: one for eighths, two for sixteenths -->
            <span
              v-for="n in event.beam"
              :key="n"
              class="bg-sheet-ink absolute left-1/2 h-px w-4 -translate-x-1/2"
              :style="{ top: `${yFor(event) + 8 + n * 3}px` }"
            />
          </button>
          </template>

          <!-- Caret position after the last note -->
          <button
            v-if="interactive && bar.events.length"
            type="button"
            class="group/gap relative w-2 shrink-0 cursor-pointer"
            :style="{ height: `${STAFF_HEIGHT - 16}px` }"
            :aria-label="`Insert at the end`"
            @click.stop="emit('insertAt', bar.id, bar.events.length)"
          >
            <span
              class="absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors"
              :class="activeBarId === bar.id && insertIndex === bar.events.length
                ? 'bg-primary'
                : 'bg-transparent group-hover/gap:bg-primary/40'"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
