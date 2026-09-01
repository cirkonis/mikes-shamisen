<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Sign in' })

const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)
const route = useRoute()
const { fetch: refreshSession } = useUserSession()

async function onSubmit() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value },
    })
    // Pull the new session into the client-side composable so the
    // global middleware sees loggedIn=true before navigateTo runs.
    await refreshSession()
    const redirect = (route.query.redirect as string | undefined) || '/'
    await navigateTo(redirect)
  } catch (e: unknown) {
    // Only a 401 actually means the password was wrong. Anything else is a
    // misconfigured server (most often NUXT_SESSION_PASSWORD under 32 chars),
    // and reporting that as "incorrect password" sends you hunting the wrong bug.
    const err = e as { statusCode?: number, data?: { message?: string } }
    if (err.statusCode === 401) {
      error.value = 'Incorrect password'
    } else {
      error.value = err.data?.message
        ? `Sign-in is misconfigured: ${err.data.message}`
        : 'Sign-in is misconfigured — check the server env vars.'
    }
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-secondary/50">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="text-2xl">三味線</CardTitle>
        <CardDescription>Enter your password to open the tab library.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              :disabled="loading"
              autofocus
            />
          </div>
          <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
          <Button type="submit" :disabled="loading || !password.length">
            {{ loading ? 'Checking…' : 'Sign in' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
