<script setup lang="ts">
import { ArrowLeft, Pencil } from 'lucide-vue-next'
import { getTuning, normalizeContent, openStrings } from '#shared/tab'

const route = useRoute()
const id = route.params.id as string

const { data: tab } = await useFetch(`/api/tabs/${id}`)
useHead({ title: () => tab.value?.title ?? 'Tab' })

const tuning = computed(() => getTuning(tab.value?.tuning ?? ''))
const content = computed(() => normalizeContent(tab.value?.content))
const playingEventId = ref<string | null>(null)
const strings = computed(() =>
  openStrings(tab.value?.tuning ?? '', content.value.baseSemitone))
</script>

<template>
  <div v-if="tab" class="mx-auto w-full max-w-7xl px-4 py-8">
    <div class="mb-8 flex items-start justify-between gap-4 print:hidden">
      <NuxtLink to="/" class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft class="size-4" /> Library
      </NuxtLink>
      <NuxtLink :to="`/tabs/${id}`">
        <Button variant="outline" size="sm"><Pencil /> Edit</Button>
      </NuxtLink>
    </div>

    <header class="mb-8">
      <h1 class="text-3xl font-semibold tracking-tight">{{ tab.title }}</h1>
      <p v-if="tab.artist" class="text-muted-foreground mt-1">{{ tab.artist }}</p>
      <p v-if="tuning" class="text-muted-foreground mt-2 text-sm">
        {{ tuning.kanji }} {{ tuning.name }} · {{ tuning.intervals }} · {{ strings.join(' – ') }}
      </p>
    </header>

    <TabPlayer
      v-model:playing-event-id="playingEventId"
      :content="content"
      :tuning="tab.tuning"
      class="mb-6 print:hidden"
    />

    <TabSheet
      :bars="content.bars"
      :bars-per-row="content.barsPerRow"
      :playing-event-id="playingEventId"
    />

    <p v-if="!content.bars.length" class="text-muted-foreground text-sm">
      Nothing written yet.
    </p>
  </div>
</template>
