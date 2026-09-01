import { existsSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'

// `vercel env pull` writes the Neon vars to .env.local, but Nuxt only reads .env.
// Load it here for local dev. On Vercel the file doesn't exist and the platform
// injects the vars directly. Note process.loadEnvFile never overrides a variable
// that is already set, so .env must not redeclare anything .env.local owns.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-04-01',
  devtools: { enabled: true },

  modules: [
    '@vueuse/nuxt',
    'nuxt-auth-utils',
  ],

  components: [
    { path: '~/components/ui', pathPrefix: false },
    '~/components',
  ],

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    appPassword: '',
    public: {
      appName: 'mikes-shamisen',
    },
  },

  nitro: {
    preset: 'vercel',
  },

  typescript: {
    strict: true,
  },
})
