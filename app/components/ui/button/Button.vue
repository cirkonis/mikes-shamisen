<script setup lang="ts">
import { type ButtonVariants, buttonVariants } from './variants'
import { cn } from '~/lib/utils'

const props = defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: string
  type?: 'button' | 'submit' | 'reset'
}>()
</script>

<template>
  <button
    :type="props.type ?? 'button'"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </button>
</template>
