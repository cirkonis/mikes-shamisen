# mikes-shamisen

A private shamisen tab editor. Write tabs in bunkafu (文化譜) notation, save them, open them in a clean view mode.

**Stack:** Nuxt 4 · Tailwind v4 · Drizzle ORM · Neon Postgres · nuxt-auth-utils · deployed on Vercel.

Same skeleton as `mikes-finances` — UI components in `app/components/ui/` use the shadcn-vue design tokens with plain HTML primitives (no `reka-ui`).

## Local setup

```sh
npm install
cp .env.example .env          # auth secrets
vercel env pull .env.local    # Neon connection strings
npm run db:migrate            # applies server/db/migrations to Neon
npm run dev
```

Then visit http://localhost:3000 — it redirects to `/login`.

## Environment variables

They live in **two files**, on purpose:

`.env` — yours, hand-written, never touched by tooling:

| Var | What | How to get it |
| --- | --- | --- |
| `NUXT_SESSION_PASSWORD` | 32+ char secret encrypting the session cookie | `openssl rand -base64 32` |
| `NUXT_APP_PASSWORD` | The single password you use to log in | Pick something strong |

`.env.local` — written by `vercel env pull .env.local`, holds `POSTGRES_URL`,
`POSTGRES_URL_NON_POOLING` and the rest of the Neon set. Overwrite it freely.

Nuxt only reads `.env` by default and drizzle-kit reads neither, so both
`nuxt.config.ts` and `drizzle.config.ts` call `process.loadEnvFile('.env.local')`
themselves.

> **Don't put `POSTGRES_URL` in `.env`.** `process.loadEnvFile` does not override a
> variable that is already set, so an empty value in `.env` beats the real one in
> `.env.local` — and you get a confusing "database not configured" error.

On Vercel neither file exists: the Neon integration injects the `POSTGRES_*` vars,
and you set the two `NUXT_*` ones yourself in Project Settings → Environment Variables.

The app still runs with no database — the library page just tells you it's unreachable.

## Database (Neon via Vercel)

Already set up. To re-point at a fresh database: create it in Vercel → Storage,
`vercel env pull .env.local`, then `npm run db:migrate`.

## Notation model

Everything lives in `shared/tab.ts`, imported by both the client and the server via `#shared/tab`.

A tab is metadata (title, artist, tuning, notes) plus a `content` jsonb column holding the bars. Bars hold an ordered list of events:

- **note** — a `string` (1–3, thickest to thinnest) and a `fret` (tsubo, 0–20)
- **rest** — drawn as a dot

Both carry a `beam` (0 = bare, 1 = single underline / eighth, 2 = double underline / sixteenth). Notes can also carry one `ornament`: slide up/down (suri), hajiki, uchi, or a tie.

Everything is assumed to be 4/4 and there is no timing engine — the underlines are marks on the page, the same way you'd write them by hand.

Tunings: honchoshi (本調子), niagari (二上り), sansagari (三下り).

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel. Framework auto-detects as Nuxt.
3. Set `NUXT_SESSION_PASSWORD` and `NUXT_APP_PASSWORD` in **Project Settings →
   Environment Variables** (the `POSTGRES_*` ones come free from the Neon integration).
4. Deploy.

No `vercel.json` needed — the Nitro preset in `nuxt.config.ts` handles it.

## Drizzle commands

```sh
npm run db:generate   # generate SQL migrations from schema.ts
npm run db:migrate    # apply generated migrations
npm run db:studio     # browse the DB in a UI
```

`db:push` exists too but prompts interactively, so the committed migrations in
`server/db/migrations/` are the source of truth — change `schema.ts`, then
`db:generate` + `db:migrate`.

## Project layout

```
app/
  components/ui/   # Button, Card, Input, Label
  layouts/         # default layout wrapper
  lib/utils.ts     # cn() + formatDate()
  middleware/      # auth.global.ts redirects unauthed traffic to /login
  pages/           # login.vue, index.vue (library), tabs/[id].vue (editor)
  assets/css/      # tailwind.css with the washi/indigo theme tokens
shared/tab.ts      # the notation model — tunings, events, zod schemas
server/
  api/auth/        # login / logout
  api/tabs/        # tab CRUD
  db/              # Drizzle schema + client + validators
types/             # auth.d.ts extends UserSession
```
