<script setup lang="ts">
import { Plus, Music2, LogOut, BookOpen } from 'lucide-vue-next'
import { getTuning } from '#shared/tab'
import { formatDate } from '~/lib/utils'

useHead({ title: 'Library' })

const { clear: clearSession } = useUserSession()

const { data: tabs, error, refresh } = await useFetch('/api/tabs')

// A FetchError's own `message` is just `[GET] "/api/tabs": 500` — the reason the
// server actually gave is nested under `data`. Reading the wrong one turns every
// backend failure into the same useless string.
const serverReason = computed(() => {
  const e = error.value as { data?: { statusMessage?: string, message?: string }, message?: string } | null
  return e?.data?.statusMessage
    ?? e?.data?.message
    ?? e?.message
    ?? 'Unknown error'
})

const creating = ref(false)

async function createTab() {
  creating.value = true
  try {
    const tab = await $fetch('/api/tabs', {
      method: 'POST',
      body: { title: 'Untitled tab', tuning: 'honchoshi' },
    })
    await navigateTo(`/tabs/${tab.id}`)
  } finally {
    creating.value = false
  }
}

async function signOut() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clearSession()
  await navigateTo('/login')
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-10">
    <header class="flex items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Tab library</h1>
        <p class="text-muted-foreground text-sm mt-1">Everything you've written down.</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/info">
          <Button variant="ghost" size="icon" title="Notes"><BookOpen /></Button>
        </NuxtLink>
        <Button variant="ghost" size="icon" title="Sign out" @click="signOut">
          <LogOut />
        </Button>
        <Button :disabled="creating" @click="createTab">
          <Plus />
          {{ creating ? 'Creating…' : 'New tab' }}
        </Button>
      </div>
    </header>

    <!-- Before Neon is wired up the API 500s; say so plainly instead of an empty list. -->
    <Card v-if="error" class="border-destructive/40">
      <CardHeader>
        <CardTitle>Can't reach the database</CardTitle>
        <CardDescription>
          {{ serverReason }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" @click="refresh()">Try again</Button>
      </CardContent>
    </Card>

    <Card v-else-if="!tabs?.length" class="border-dashed">
      <CardHeader class="items-center text-center">
        <Music2 class="size-8 text-muted-foreground mb-2" />
        <CardTitle>No tabs yet</CardTitle>
        <CardDescription>Write your first one — name it, pick a tuning, start adding bars.</CardDescription>
      </CardHeader>
    </Card>

    <ul v-else class="flex flex-col gap-3">
      <li v-for="tab in tabs" :key="tab.id">
        <NuxtLink :to="`/tabs/${tab.id}`" class="block">
          <Card class="py-4 transition-colors hover:border-ring hover:bg-accent/40">
            <CardContent class="flex items-baseline justify-between gap-4">
              <div class="min-w-0">
                <p class="font-medium truncate">{{ tab.title }}</p>
                <p v-if="tab.artist" class="text-muted-foreground text-sm truncate">{{ tab.artist }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm">{{ getTuning(tab.tuning)?.kanji ?? tab.tuning }}</p>
                <p class="text-muted-foreground text-xs">{{ formatDate(tab.updatedAt) }}</p>
              </div>
            </CardContent>
          </Card>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
