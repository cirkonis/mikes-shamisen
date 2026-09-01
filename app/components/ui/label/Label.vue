<script setup lang="ts">
import { cn } from '~/lib/utils'

const props = defineProps<{ class?: string; for?: string }>()
</script>

<template>
  <label
    :for="props.for"
    :class="cn('flex items-center gap-2 text-sm leading-none font-medium select-none', props.class)"
  >
    <slot />
  </label>
</template>
