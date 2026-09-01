<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} · mikes-shamisen` : 'mikes-shamisen'),
  meta: [
    {
      name: 'viewport',
      content:
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
