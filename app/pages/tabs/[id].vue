<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { TUNINGS } from '#shared/tab'

const route = useRoute()
const id = route.params.id as string

const { data: tab } = await useFetch(`/api/tabs/${id}`)

useHead({ title: () => tab.value?.title ?? 'Tab' })

const saving = ref(false)

async function save() {
  if (!tab.value) return
  saving.value = true
  try {
    await $fetch(`/api/tabs/${id}`, {
      method: 'PATCH',
      body: {
        title: tab.value.title,
        artist: tab.value.artist,
        tuning: tab.value.tuning,
      },
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="tab" class="mx-auto w-full max-w-4xl px-4 py-10">
    <NuxtLink to="/" class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm mb-6">
      <ArrowLeft class="size-4" /> Library
    </NuxtLink>

    <div class="grid gap-4 sm:grid-cols-[1fr_auto] items-end mb-8">
      <div class="flex flex-col gap-2">
        <Label for="title">Title</Label>
        <Input id="title" v-model="tab.title" class="h-11 text-lg" @blur="save" />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="tuning">Tuning</Label>
        <select
          id="tuning"
          v-model="tab.tuning"
          class="border-input bg-transparent h-11 rounded-md border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          @change="save"
        >
          <option v-for="t in TUNINGS" :key="t.id" :value="t.id">
            {{ t.kanji }} {{ t.name }} — {{ t.intervals }}
          </option>
        </select>
      </div>
    </div>

    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>The sheet</CardTitle>
        <CardDescription>
          Bars, notes, rests and beams land here next.
        </CardDescription>
      </CardHeader>
    </Card>

    <p class="text-muted-foreground text-xs mt-4 h-4">{{ saving ? 'Saving…' : '' }}</p>
  </div>
</template>
