import tailwindcss from '@tailwindcss/vite'

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
