# mikes-shamisen

A private shamisen tab editor. Write tabs in bunkafu (文化譜) notation, save them, open them in a clean view mode.

**Stack:** Nuxt 4 · Tailwind v4 · Drizzle ORM · Neon Postgres · nuxt-auth-utils · deployed on Vercel.

Same skeleton as `mikes-finances` — UI components in `app/components/ui/` use the shadcn-vue design tokens with plain HTML primitives (no `reka-ui`).

## Local setup

```sh
npm install
cp .env.example .env
# fill in the secrets (see below)
npm run db:push    # creates the tabs table on the Neon database
npm run dev
```

Then visit http://localhost:3000 — it redirects to `/login`.

## Environment variables

| Var | What | How to get it |
| --- | --- | --- |
| `NUXT_SESSION_PASSWORD` | 32+ char secret encrypting the session cookie | `openssl rand -base64 32` |
| `NUXT_APP_PASSWORD` | The single password you use to log in | Pick something strong |
| `POSTGRES_URL` | Pooled Neon connection string | Neon / Vercel Marketplace |
| `POSTGRES_URL_NON_POOLING` | Direct Neon connection string (used by `drizzle-kit`) | Same place |

The app runs without the `POSTGRES_*` vars — the library page just tells you the database is unreachable.

## Database (Neon via Vercel)

1. Vercel dashboard → Storage → **Create Database** → Neon.
2. Connect it to this project; Vercel injects `POSTGRES_URL` (and friends) into production.
3. For local dev: `vercel env pull .env` — or copy them from the Neon dashboard.
4. Run `npm run db:push` once to create the tables.

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
3. Set the env vars above in **Project Settings → Environment Variables**.
4. Deploy.

No `vercel.json` needed — the Nitro preset in `nuxt.config.ts` handles it.

## Drizzle commands

```sh
npm run db:generate   # generate SQL migrations from schema.ts
npm run db:migrate    # apply generated migrations
npm run db:push       # skip migration files, push schema directly (dev only)
npm run db:studio     # browse the DB in a UI
```

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
