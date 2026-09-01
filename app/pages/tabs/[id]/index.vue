<script setup lang="ts">
import { ArrowLeft, Eye, Plus, Trash2 } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import type { Bar, StringNumber, TabContent, TabEvent } from '#shared/tab'
import {
  BASE_SEMITONE, FINGERS, FINGER_NUMERALS, MAX_FRET, NOTE_NAMES, ORNAMENTS,
  ORNAMENT_LABELS, STRING_LABELS, TUNINGS, newBar, newNote, newRest,
  ACCIDENTALS, ACCIDENTAL_GLYPHS, openStrings, parseContent,
} from '#shared/tab'
import type { Accidental, Finger } from '#shared/tab'

const route = useRoute()
const id = route.params.id as string

// deep: true is required — useFetch's data is a shallowRef by default, so the
// v-model writes to tab.title/tab.tuning would mutate the object without ever
// triggering a recompute (the derived readouts would silently show stale values).
const { data: tab } = await useFetch(`/api/tabs/${id}`, { deep: true })
useHead({ title: () => tab.value?.title ?? 'Tab' })

// parseContent widens older tabs (single-stop notes, missing settings) into the
// current shape, so the editor never has to branch on which era wrote them.
const parsed = parseContent(tab.value?.content)
/** Set when the stored content couldn't be read; saving stays off while it is. */
const contentError = ref<string | null>(parsed.ok ? null : parsed.issue)
const content = ref<TabContent>(parsed.content)

/** The three open strings as actual note names, for the header readout. */
const openStringNames = computed(() =>
  openStrings(tab.value?.tuning ?? '', content.value.baseSemitone))
const activeBarId = ref<string | null>(content.value.bars.at(-1)?.id ?? null)
const selectedEventId = ref<string | null>(null)
/** Where the next added event lands. null = append to the end of the bar. */
const insertIndex = ref<number | null>(null)
/** Highlighted while playback is running. */
const playingEventId = ref<string | null>(null)

const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

const activeBar = computed(() =>
  content.value.bars.find((b) => b.id === activeBarId.value) ?? null)

const selected = computed(() => {
  for (const bar of content.value.bars) {
    const event = bar.events.find((e) => e.id === selectedEventId.value)
    if (event) return { bar, event }
  }
  return null
})

/** The fret buttons. Bunkafu positions run 0 upward. */
const frets = Array.from({ length: MAX_FRET + 1 }, (_, i) => i)
/** Listed the way they are drawn: third string on top, first at the bottom. */
const strings: StringNumber[] = [3, 2, 1]

async function save() {
  if (!tab.value) return
  saveState.value = 'saving'
  try {
    await $fetch(`/api/tabs/${id}`, {
      method: 'PATCH',
      body: {
        title: tab.value.title,
        tuning: tab.value.tuning,
        content: content.value,
      },
    })
    saveState.value = 'saved'
  } catch {
    saveState.value = 'error'
  }
}

// Autosave, but not on every keystroke or every note.
const queueSave = useDebounceFn(save, 700)

watch(content, () => {
  // Refuse to overwrite a tab we failed to read in the first place.
  if (contentError.value) return
  queueSave()
}, { deep: true })

function addBar() {
  const bar = newBar()
  content.value.bars.push(bar)
  activeBarId.value = bar.id
  selectedEventId.value = null
  insertIndex.value = null
}

/** Selecting a note puts the caret just after it — the usual next edit. */
function selectEvent(barId: string, eventId: string) {
  activeBarId.value = barId
  selectedEventId.value = eventId
  const bar = content.value.bars.find((b) => b.id === barId)
  const i = bar?.events.findIndex((e) => e.id === eventId) ?? -1
  insertIndex.value = i >= 0 ? i + 1 : null
}

function selectBar(barId: string) {
  activeBarId.value = barId
  selectedEventId.value = null
  insertIndex.value = null
}

/**
 * Two-step inline confirm rather than window.confirm(): a native dialog is
 * suppressed outright in some embedded browsers, which would turn "delete" into
 * a button that silently does nothing.
 */
const confirmingDelete = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

async function deleteTab() {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => (confirmingDelete.value = false), 4000)
    return
  }
  clearTimeout(confirmTimer)
  await $fetch(`/api/tabs/${id}`, { method: 'DELETE' })
  await navigateTo('/')
}

onBeforeUnmount(() => clearTimeout(confirmTimer))

function addEvent(event: TabEvent) {
  // Adding with nothing selected is common enough that silently creating the
  // first bar beats making you click "Add bar" before you can write anything.
  if (!activeBar.value) addBar()
  const events = activeBar.value!.events
  const at = insertIndex.value ?? events.length
  events.splice(at, 0, event)
  // Advance the caret so a run of notes goes in reading order rather than
  // stacking up backwards at the insertion point.
  insertIndex.value = at + 1
  selectedEventId.value = event.id
}

function addNote(string: StringNumber, fret: number) {
  addEvent(newNote(string, fret))
}

function deleteSelected() {
  const found = selected.value
  if (!found) return
  const at = found.bar.events.findIndex((e) => e.id === found.event.id)
  found.bar.events.splice(at, 1)
  // Leave the caret where the note was, so retyping it is one click.
  insertIndex.value = at
  selectedEventId.value = null
}

function deleteBar(bar: Bar) {
  content.value.bars = content.value.bars.filter((b) => b.id !== bar.id)
  if (activeBarId.value === bar.id) {
    activeBarId.value = content.value.bars.at(-1)?.id ?? null
  }
}

function cycleBeam() {
  const event = selected.value?.event
  if (!event) return
  event.beam = ((event.beam + 1) % 3) as 0 | 1 | 2
}

/** Is this string part of the selected chord? */
function stopFor(string: StringNumber) {
  const event = selected.value?.event
  if (!event || event.kind !== 'note') return undefined
  return event.stops.find((st) => st.string === string)
}

/**
 * Add or remove a string from the selected note, turning it into a chord.
 * The last remaining stop can't be removed — an empty note would render as
 * nothing; deleting the event is what you actually want there.
 */
function toggleStop(string: StringNumber) {
  const event = selected.value?.event
  if (!event || event.kind !== 'note') return
  const at = event.stops.findIndex((st) => st.string === string)
  if (at >= 0) {
    if (event.stops.length === 1) return
    event.stops.splice(at, 1)
    return
  }
  event.stops.push({ string, fret: 0, accidental: null })
  event.stops.sort((a, b) => a.string - b.string)
}

function setStopFret(string: StringNumber, value: number) {
  const stop = stopFor(string)
  if (stop) stop.fret = Math.min(MAX_FRET, Math.max(0, Math.round(value || 0)))
}

/** Cycles none -> sharp -> flat, since the neck marks the same pitch either way. */
function cycleAccidental(string: StringNumber) {
  const stop = stopFor(string)
  if (!stop) return
  const next: (Accidental | null)[] = [null, ...ACCIDENTALS]
  stop.accidental = next[(next.indexOf(stop.accidental) + 1) % next.length]!
}

/** Clicking the finger already set clears it — no separate "none" button. */
function toggleFinger(finger: Finger) {
  const event = selected.value?.event
  if (!event || event.kind !== 'note') return
  event.finger = event.finger === finger ? null : finger
}

function setOrnament(value: string) {
  const event = selected.value?.event
  if (!event || event.kind !== 'note') return
  event.ornament = value === '' ? null : (value as typeof ORNAMENTS[number])
}
</script>

<template>
  <div v-if="tab" class="mx-auto w-full max-w-7xl px-4 py-8">
    <div class="mb-6 flex items-center justify-between gap-4">
      <NuxtLink to="/" class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft class="size-4" /> Library
      </NuxtLink>
      <div class="flex items-center gap-3">
        <span class="text-muted-foreground text-xs">
          {{ { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Save failed' }[saveState] }}
        </span>
        <NuxtLink :to="`/tabs/${id}/view`">
          <Button variant="outline" size="sm"><Eye /> View</Button>
        </NuxtLink>
        <Button
          :variant="confirmingDelete ? 'destructive' : 'ghost'"
          size="sm"
          :class="confirmingDelete ? '' : 'text-destructive'"
          @click="deleteTab"
        >
          <Trash2 /> {{ confirmingDelete ? 'Really delete?' : 'Delete tab' }}
        </Button>
      </div>
    </div>

    <Card v-if="contentError" class="border-destructive/50 mb-6">
      <CardHeader>
        <CardTitle>This tab couldn't be read</CardTitle>
        <CardDescription>
          {{ contentError }} — editing is disabled so the stored version isn't
          overwritten. The raw content is still safe in the database.
        </CardDescription>
      </CardHeader>
    </Card>

    <div class="mb-6 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
      <div class="flex flex-col gap-2">
        <Label for="title">Title</Label>
        <Input id="title" v-model="tab.title" class="h-11 text-lg" @input="queueSave" />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="tuning">Tuning</Label>
        <select
          id="tuning"
          v-model="tab.tuning"
          class="border-input h-11 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          @change="queueSave"
        >
          <option v-for="t in TUNINGS" :key="t.id" :value="t.id">
            {{ t.kanji }} {{ t.name }} — {{ t.intervals }}
          </option>
        </select>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="base">First string</Label>
        <select
          id="base"
          v-model.number="content.baseSemitone"
          class="border-input h-11 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <option v-for="(n, i) in NOTE_NAMES" :key="n" :value="i">{{ n }}</option>
        </select>
      </div>
    </div>

    <p class="text-muted-foreground -mt-3 mb-5 font-tab text-sm">
      {{ openStringNames.join('  \u2013  ') }}
    </p>

    <div class="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
      <TabPlayer
        v-model:playing-event-id="playingEventId"
        :content="content"
        :tuning="tab.tuning"
      />
      <div class="flex items-center gap-2">
      <Label for="per-row" class="text-muted-foreground text-xs">Bars per row</Label>
      <select
        id="per-row"
        v-model.number="content.barsPerRow"
        class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
      >
        <option v-for="n in [1, 2, 3, 4, 5, 6, 8]" :key="n" :value="n">{{ n }}</option>
      </select>
      </div>
    </div>

    <!-- The sheet -->
    <TabSheet
      :bars="content.bars"
      :active-bar-id="activeBarId"
      :selected-event-id="selectedEventId"
      :insert-index="insertIndex"
      :bars-per-row="content.barsPerRow"
      :playing-event-id="playingEventId"
      interactive
      class="mb-4"
      @select-bar="selectBar"
      @select-event="selectEvent"
      @insert-at="(barId, index) => { activeBarId = barId; insertIndex = index }"
    />

    <div class="mb-8 flex items-center gap-2">
      <Button variant="outline" size="sm" @click="addBar"><Plus /> Add bar</Button>
      <Button
        v-if="activeBar"
        variant="ghost"
        size="sm"
        class="text-destructive"
        @click="deleteBar(activeBar)"
      >
        <Trash2 /> Delete bar {{ content.bars.indexOf(activeBar) + 1 }}
      </Button>
    </div>

    <!-- Entry pad: adds to the highlighted bar -->
    <Card class="mb-4">
      <CardHeader>
        <CardTitle class="text-base">
          Add to bar {{ activeBar ? content.bars.indexOf(activeBar) + 1 : '—' }}
        </CardTitle>
        <CardDescription>
          Pick a string, then a position. The dot adds a rest.
          {{ insertIndex === null || !activeBar
            ? 'Adding to the end.'
            : `Inserting at position ${insertIndex + 1} — click a gap in the bar to move the caret.` }}
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <div v-for="s in strings" :key="s" class="flex items-center gap-2">
          <span class="text-muted-foreground w-10 shrink-0 text-xs">
            {{ STRING_LABELS[s] }} · {{ s }}
          </span>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="f in frets"
              :key="f"
              type="button"
              class="border-border hover:border-primary hover:bg-primary/10 h-7 w-7 cursor-pointer rounded border font-tab text-xs"
              @click="addNote(s, f)"
            >{{ f }}</button>
          </div>
        </div>
        <div>
          <Button variant="secondary" size="sm" @click="addEvent(newRest())">
            Add rest •
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Editing one selected note -->
    <Card v-if="selected">
      <CardHeader>
        <CardTitle class="text-base">
          {{ selected.event.kind === 'note' ? 'Note' : 'Rest' }} in bar
          {{ content.bars.indexOf(selected.bar) + 1 }}
        </CardTitle>
      </CardHeader>
      <CardContent class="flex flex-wrap items-end gap-4">
        <template v-if="selected.event.kind === 'note'">
          <div class="flex flex-col gap-2">
            <Label>Strings <span class="text-muted-foreground font-normal">(tick more than one for a chord)</span></Label>
            <div class="flex gap-4">
              <div v-for="s in strings" :key="s" class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="h-8 w-9 cursor-pointer rounded border text-xs"
                  :class="stopFor(s)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border'"
                  @click="toggleStop(s)"
                >{{ STRING_LABELS[s] }}</button>
                <Input
                  v-if="stopFor(s)"
                  :model-value="stopFor(s)!.fret"
                  type="number"
                  :min="0"
                  :max="MAX_FRET"
                  class="w-16"
                  @update:model-value="setStopFret(s, Number($event))"
                />
                <button
                  v-if="stopFor(s)"
                  type="button"
                  title="The unnumbered position between two tsubo"
                  class="h-8 w-8 cursor-pointer rounded border text-xs"
                  :class="stopFor(s)!.accidental
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border'"
                  @click="cycleAccidental(s)"
                >{{ stopFor(s)!.accidental ? ACCIDENTAL_GLYPHS[stopFor(s)!.accidental!] : '♯' }}</button>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <Label>Finger</Label>
            <div class="flex gap-1">
              <button
                v-for="f in FINGERS"
                :key="f"
                type="button"
                class="h-8 w-9 cursor-pointer rounded border text-xs"
                :class="selected.event.finger === f
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border'"
                @click="toggleFinger(f)"
              >{{ FINGER_NUMERALS[f] }}</button>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <Label for="ornament">Ornament</Label>
            <select
              id="ornament"
              class="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
              :value="selected.event.ornament ?? ''"
              @change="setOrnament(($event.target as HTMLSelectElement).value)"
            >
              <option value="">None</option>
              <option v-for="o in ORNAMENTS" :key="o" :value="o">{{ ORNAMENT_LABELS[o] }}</option>
            </select>
          </div>
        </template>

        <div class="flex flex-col gap-2">
          <Label>Underline</Label>
          <Button variant="outline" size="sm" @click="cycleBeam">
            {{ ['none', 'single', 'double'][selected.event.beam] }}
          </Button>
        </div>

        <Button variant="ghost" size="sm" class="text-destructive" @click="deleteSelected">
          <Trash2 /> Delete
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
