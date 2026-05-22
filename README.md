# Arabic Reader

> An immersive Arabic reading environment that converts input into acquisition.

A calm-academia-styled PWA for Arabic acquisition through extensive reading, sentence mining, and intelligent SRS. Inspired by LingQ's reading workflow, Anki's spaced repetition, and Refold's sentence mining philosophy — built from scratch with an Arabic-first morphology layer and LLM-powered word analysis.

**This commit ships the complete acquisition loop end-to-end:** sign up → add a text → read with tap-to-define → mine sentences → review with SM-2.

---

## Table of contents

1. [What's working](#whats-working)
2. [Tech stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Setup — five parts](#setup--five-parts)
   - [Part 1 · Local install](#part-1--local-install)
   - [Part 2 · Supabase project](#part-2--supabase-project)
   - [Part 3 · Database schema](#part-3--database-schema)
   - [Part 4 · Edge Function (LLM word analysis)](#part-4--edge-function-llm-word-analysis)
   - [Part 5 · Environment variables](#part-5--environment-variables)
5. [Running locally](#running-locally)
6. [Deployment](#deployment)
7. [Daily flow — how to use the app](#daily-flow--how-to-use-the-app)
8. [Project structure](#project-structure)
9. [What's next](#whats-next)
10. [License](#license)

---

## What's working

| Capability | Status |
| --- | --- |
| Email + password auth | ✅ |
| Library — paste & manage texts | ✅ |
| Reader with RTL tokenization | ✅ |
| Tap-to-define (LLM-powered) | ✅ |
| Root + morphology + sentence translation | ✅ |
| Word state tracking (unknown / learning / known / ignored) | ✅ |
| Sentence mining → SRS card | ✅ |
| SM-2 review queue with keyboard shortcuts | ✅ |
| Calm academia design + self-hosted fonts | ✅ |
| PWA install + offline service worker | ✅ |
| PDF / EPUB upload | ⏳ later |
| Audio sync (karaoke + shadowing) | ⏳ later |
| Notebook AI (per-text Q&A) | ⏳ later |
| Exposure-aware auto-acquired detection | ⏳ later |

---

## Tech stack

- **Framework:** React 18 + Vite 5 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 (CSS-first config)
- **Routing:** React Router v6
- **PWA:** vite-plugin-pwa (Workbox)
- **Fonts:** Amiri, Reem Kufi, Fraunces via @fontsource (self-hosted)
- **Backend:** Supabase (Postgres + RLS + Edge Functions)
- **LLM:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via Edge Function
- **Hosting:** Vercel

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A GitHub account
- A Supabase account → https://supabase.com
- A Vercel account → https://vercel.com
- An Anthropic API key → https://console.anthropic.com (~$5 credit is plenty to start; Haiku 4.5 costs $1 per 1M input tokens / $5 per 1M output)
- **Supabase CLI** for migrations + functions:
  ```bash
  # macOS / Linux
  brew install supabase/tap/supabase
  # or via npm
  npm install -g supabase
  ```

---

## Setup — five parts

### Part 1 · Local install

```bash
unzip arabic-app.zip
cd arabic-app
npm install
```

### Part 2 · Supabase project

1. https://supabase.com/dashboard → **New project**
2. Name it (e.g. `arabic-reader`), pick a strong DB password, choose region (for Karachi: **Singapore** or **Mumbai**).
3. Wait ~2 minutes for provisioning.
4. **Settings → Data API:** copy the **Project URL** and the **`anon` public** key — you'll need both in Part 5.
5. **Database → Extensions:** enable `vector` (for Step 11 later — harmless now).
6. **Authentication → Providers → Email:** make sure it's enabled. For development, **uncheck "Confirm email"** so accounts work instantly without setting up SMTP. (Re-enable when you go to production.)

### Part 3 · Database schema

The migration file at `supabase/migrations/20260521120000_initial_schema.sql` creates all tables, enums, indexes, RLS policies, and triggers.

#### Option A — Apply via Supabase CLI (recommended)

```bash
# Log in to Supabase CLI
supabase login

# Link this folder to your project — find the ref in the dashboard URL: supabase.com/dashboard/project/<REF>
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to the remote database
supabase db push
```

#### Option B — Paste into the SQL Editor

Open Supabase Dashboard → **SQL Editor → New query** → paste the entire contents of `supabase/migrations/20260521120000_initial_schema.sql` → **Run**.

You should see five tables in the **Table Editor**: `profiles`, `texts`, `vocabulary`, `cards`, `reviews`.

### Part 4 · Edge Function (LLM word analysis)

The Edge Function at `supabase/functions/analyze-word/` proxies word analysis requests to Anthropic's API. Your Anthropic key stays server-side as a Supabase secret.

```bash
# Set the Anthropic key as a project secret (server-side only — never goes to the browser)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here

# Deploy the function
supabase functions deploy analyze-word
```

Verify in **Dashboard → Edge Functions** that `analyze-word` is deployed and active.

> **Note:** Each tap on a new word costs roughly **$0.0005** with Haiku 4.5 — about 2000 words for $1. Once a word is in your vocabulary, the modal hits the database instead of the LLM.

### Part 5 · Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
```

The anon key is safe to expose — Row Level Security protects every table.

---

## Running locally

```bash
npm run dev
```

→ http://localhost:5173

Sign up (any email + password ≥ 6 chars). You should land in the empty Library. Click **Add text**, paste any Arabic text, save, open it, and tap a word.

### Useful commands

```bash
npm run dev          # local dev server
npm run build        # production build → dist/
npm run preview      # serve the production build
npm run typecheck    # tsc --noEmit
```

---

## Deployment

### GitHub

```bash
git init && git add . && git commit -m "step 1-8: full acquisition loop"
gh repo create arabic-app --private --source=. --push
```

### Vercel

1. https://vercel.com/new → import your repo.
2. Framework preset: **Vite** (auto-detected via `vercel.json`).
3. **Environment Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Click **Deploy**.

You get a live URL in ~60 seconds. Every push to `main` redeploys. Branch previews come free.

---

## Daily flow — how to use the app

1. **Sign up** at `/login`. Profile row is auto-created.
2. **Library** (`/library`) — paste an Arabic article, story, or any text you'd like to read.
3. **Click a text** to open the reader. Words appear with these states:
   - **Highlighted** (unknown) — never tapped
   - **Soft highlight** (learning) — tapped + mined to your SRS
   - **Faint** (mined but you marked it known) — context only
   - **No highlight** (known) — invisible chrome
4. **Tap any word.** Claude analyzes it in ~1 second and shows:
   - Lemma + root + part of speech
   - English translation + definition
   - Full sentence translation
   - Morphology (form/tense/person/number/gender)
5. **Choose what to do:**
   - **Mine sentence** → creates an SRS card. Word is now "learning".
   - **I know this** → no card, marks "known". The word goes invisible in this and all future texts.
   - **Ignore** → never highlight again. Useful for proper nouns.
6. **Review** (`/review`) when cards are due. Hotkeys: **Space** flips, **1/2/3/4** = Again / Hard / Good / Easy.

The acquisition engine is the loop between **reading → mining → reviewing → re-encountering** in new texts. Cards reinforce; reading carries the meaning.

---

## Project structure

```
arabic-app/
├── src/
│   ├── main.tsx                  # font imports, root render
│   ├── App.tsx                   # router + auth gate
│   ├── lib/
│   │   ├── supabase.ts           # client singleton
│   │   ├── arabic.ts             # tokenizer + tashkeel helpers
│   │   ├── srs.ts                # SM-2 scheduler
│   │   └── queries.ts            # all Supabase reads/writes
│   ├── types/database.ts         # hand-written DB types
│   ├── styles/globals.css        # theme + Arabic typography
│   ├── components/ui/            # Button, Modal
│   └── features/
│       ├── auth/                 # AuthProvider, LoginPage, AppLayout
│       ├── library/              # LibraryPage + add dialog
│       ├── reader/               # ReaderPage + WordModal
│       └── review/               # ReviewPage (flip card UI)
├── supabase/
│   ├── migrations/
│   │   └── 20260521120000_initial_schema.sql
│   └── functions/
│       └── analyze-word/         # Edge Function (calls Claude)
├── public/                       # favicon, PWA icons
├── .env.example
├── package.json
├── vite.config.ts                # PWA + Tailwind v4 + path alias
├── vercel.json
└── tsconfig.{json,app.json,node.json}
```

---

## What's next

The architecture is ready for:

| Future | What lands |
| --- | --- |
| PDF/EPUB upload | Parse → store as text. Use `pdfjs-dist` + `epub.js`. |
| Audio + sync | Storage bucket for audio, Whisper for word-level alignment, karaoke reader. |
| Exposure-aware acquisition | Track encounter counts; auto-promote vocab when seen N times without lookup. |
| Notebook AI | pgvector embeddings per text → Q&A about grammar patterns. |
| Mobile install prompts | Add `BeforeInstallPromptEvent` handling. |
| Root family pages | Group vocabulary by trilateral root. |

Each lives in its own feature folder and re-uses the existing query layer.

---

## License

MIT — see [LICENSE](./LICENSE).

<div dir="rtl" style="text-align: right; font-family: 'Amiri', serif; font-size: 1.2rem; margin-top: 2rem;">
وَقُل رَبِّ زِدْنِي عِلْمًا
</div>
