<script setup lang="ts">
import { Play, Square } from 'lucide-vue-next'
import type { TabContent } from '#shared/tab'

const props = defineProps<{
  content: TabContent
  tuning: string
}>()

const playingEventId = defineModel<string | null>('playingEventId', { default: null })

const { bpm, isPlaying, playingEventId: current, play, stop } = useTabPlayer()

watch(current, (value) => {
  playingEventId.value = value
})

function toggle() {
  if (isPlaying.value) stop()
  else play(props.content, props.tuning)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <Button variant="outline" size="sm" @click="toggle">
      <component :is="isPlaying ? Square : Play" />
      {{ isPlaying ? 'Stop' : 'Play' }}
    </Button>
    <div class="flex items-center gap-2">
      <Label for="bpm" class="text-muted-foreground text-xs">Tempo</Label>
      <input
        id="bpm"
        v-model.number="bpm"
        type="range"
        min="40"
        max="180"
        step="5"
        class="accent-primary w-28"
      >
      <span class="text-muted-foreground font-tab w-14 text-xs">{{ bpm }} bpm</span>
    </div>
  </div>
</template>
