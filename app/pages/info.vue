<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import {
  BASE_SEMITONE, MAX_FRET, NOTE_NAMES, ORNAMENTS, ORNAMENT_GLYPHS,
  ORNAMENT_LABELS, STRING_LABELS, TUNINGS, noteName, openStrings, pitchAt,
} from '#shared/tab'
import type { StringNumber, TuningId } from '#shared/tab'

useHead({ title: 'Notes' })

/** Which tuning the fingerboard chart is showing. */
const tuningId = ref<TuningId>('honchoshi')

/** The first string's pitch. Shamisen has no fixed pitch — it follows the singer. */
const base = ref(BASE_SEMITONE)

const strings: StringNumber[] = [1, 2, 3]
const frets = Array.from({ length: MAX_FRET + 1 }, (_, i) => i)
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-8">
    <NuxtLink to="/" class="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm">
      <ArrowLeft class="size-4" /> Library
    </NuxtLink>

    <header class="mb-10">
      <h1 class="text-3xl font-semibold tracking-tight">Notes</h1>
      <p class="text-muted-foreground mt-1">Things worth not re-learning every time.</p>
    </header>

    <!-- Tunings -->
    <section class="mb-12">
      <h2 class="mb-1 text-xl font-semibold">Tunings</h2>
      <p class="text-muted-foreground mb-4 text-sm">
        Shamisen has no fixed pitch — it is tuned to the singer, so only the intervals
        between the strings are fixed. The note names below assume the first string is
        <strong>{{ noteName(base) }}</strong>.
      </p>

      <div class="grid gap-3 sm:grid-cols-3">
        <Card v-for="t in TUNINGS" :key="t.id" class="gap-3 py-4">
          <CardHeader class="px-4">
            <CardTitle class="text-base">{{ t.kanji }} · {{ t.name }}</CardTitle>
            <CardDescription>{{ t.intervals }}</CardDescription>
          </CardHeader>
          <CardContent class="px-4">
            <p class="font-tab text-primary mb-2 text-sm">
              {{ openStrings(t.id, base).join('  –  ') }}
            </p>
            <p class="text-muted-foreground text-sm">{{ t.description }}</p>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- Fingerboard -->
    <section class="mb-12">
      <h2 class="mb-1 text-xl font-semibold">What the numbers sound like</h2>
      <p class="text-muted-foreground mb-4 text-sm">
        Positions (tsubo) along the neck and the note each one gives.
      </p>

      <div class="mb-4 flex flex-wrap items-end gap-4">
        <div class="flex flex-col gap-2">
          <Label for="chart-tuning">Tuning</Label>
          <select
            id="chart-tuning"
            v-model="tuningId"
            class="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            <option v-for="t in TUNINGS" :key="t.id" :value="t.id">
              {{ t.kanji }} {{ t.name }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="chart-base">First string</Label>
          <select
            id="chart-base"
            v-model.number="base"
            class="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            <option v-for="(n, i) in NOTE_NAMES" :key="n" :value="i">{{ n }}</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-secondary/60">
              <th class="text-muted-foreground px-2 py-2 text-left text-xs font-medium">String</th>
              <th
                v-for="f in frets"
                :key="f"
                class="text-muted-foreground font-tab px-2 py-2 text-center text-xs font-medium"
              >{{ f }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in strings" :key="s" class="border-t">
              <th class="text-muted-foreground px-2 py-2 text-left text-xs font-medium whitespace-nowrap">
                {{ STRING_LABELS[s] }} · {{ s }}
              </th>
              <td
                v-for="f in frets"
                :key="f"
                class="font-tab px-2 py-2 text-center"
                :class="f === 0 ? 'text-primary font-semibold' : ''"
              >{{ pitchAt(tuningId, s, f, base) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-muted-foreground mt-3 text-xs">
        Worth checking against your own chart: this treats the bunkafu numbers as
        chromatic positions, so 12 is the octave. Schools differ. If yours does,
        <code>semitonesForTsubo()</code> in <code>shared/tab.ts</code> is the only
        thing that needs changing.
      </p>
    </section>

    <!-- Notation key -->
    <section class="mb-12">
      <h2 class="mb-1 text-xl font-semibold">Reading the notation</h2>
      <p class="text-muted-foreground mb-4 text-sm">
        Bunkafu (文化譜): three lines, one per string, read left to right.
      </p>

      <dl class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border p-3">
          <dt class="font-medium">A number</dt>
          <dd class="text-muted-foreground text-sm">
            The position to stop, on whichever string's line it sits. 0 is the open string.
          </dd>
        </div>
        <div class="rounded-lg border p-3">
          <dt class="font-medium">A dot •</dt>
          <dd class="text-muted-foreground text-sm">A rest — nothing is played.</dd>
        </div>
        <div class="rounded-lg border p-3">
          <dt class="font-medium">One underline</dt>
          <dd class="text-muted-foreground text-sm">Half as long — an eighth note.</dd>
        </div>
        <div class="rounded-lg border p-3">
          <dt class="font-medium">Two underlines</dt>
          <dd class="text-muted-foreground text-sm">Half again — a sixteenth.</dd>
        </div>
        <div v-for="o in ORNAMENTS" :key="o" class="rounded-lg border p-3">
          <dt class="font-medium">
            <span class="text-primary font-tab mr-1">{{ ORNAMENT_GLYPHS[o] }}</span>
            {{ ORNAMENT_LABELS[o] }}
          </dt>
          <dd class="text-muted-foreground text-sm">
            {{ {
              'slide-up': 'Slide up into the note without re-striking it.',
              'slide-down': 'Slide down into the note without re-striking it.',
              'hajiki': 'Pluck with a left-hand finger rather than the bachi.',
              'uchi': 'Strike the string down with a left-hand finger.',
              'tie': 'Held through into the next note.',
            }[o] }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- Room to grow -->
    <section>
      <h2 class="mb-1 text-xl font-semibold">Everything else</h2>
      <p class="text-muted-foreground text-sm">
        Add sections to <code>app/pages/info.vue</code> as you learn things — bachi grip,
        the parts of the instrument, whatever stops sticking.
      </p>
    </section>
  </div>
</template>
