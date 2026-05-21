# Arabic Reader

> An immersive Arabic reading and listening environment that naturally converts input into acquisition.

A calm-academia-styled PWA for Arabic acquisition through extensive reading, sentence mining, and intelligent SRS. Inspired by LingQ's reading workflow, Anki's spaced repetition, and Refold's sentence mining philosophy — built from scratch with an Arabic-first morphology layer.

This repository is the **Step 1 foundation**: working Vite + React + TypeScript + PWA scaffold, deployable to Vercel in under five minutes, with the Supabase client wired up and a calm-academia design system in place.

---

## Table of contents

1. [What's in this commit](#whats-in-this-commit)
2. [Tech stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Quick start (TL;DR)](#quick-start-tldr)
5. [Detailed setup](#detailed-setup)
   - [Local install](#1-local-install)
   - [Supabase project](#2-supabase-project)
   - [Environment variables](#3-environment-variables)
   - [Fonts (optional but recommended)](#4-fonts-optional-but-recommended)
   - [Run locally](#5-run-locally)
6. [Deployment](#deployment)
   - [GitHub](#github)
   - [Vercel](#vercel)
7. [Project structure](#project-structure)
8. [What's next (roadmap)](#whats-next-roadmap)
9. [Design principles](#design-principles)
10. [License](#license)

---

## What's in this commit

| Layer            | Status                                                             |
| ---------------- | ------------------------------------------------------------------ |
| Vite + React + TS | ✅ configured with strict mode, path alias `@/*`                    |
| Tailwind CSS v4  | ✅ design tokens defined as CSS variables in `globals.css`          |
| PWA              | ✅ manifest, service worker, offline caching for Supabase Storage  |
| Supabase client  | ✅ singleton with safe-default fallback for missing env vars       |
| Design system    | ✅ calm academia palette, Arabic-first typography, word-state classes |
| Folder structure | ✅ feature-first layout ready for Steps 2–12                       |
| Database         | ⏳ Step 2                                                          |
| Reader           | ⏳ Step 5                                                          |
| Edge Functions   | ⏳ Step 6                                                          |
| SRS engine       | ⏳ Step 8                                                          |

---

## Tech stack

| Concern             | Choice                            |
| ------------------- | --------------------------------- |
| Framework           | React 18 + Vite 5                 |
| Language            | TypeScript (strict)               |
| Styling             | Tailwind CSS v4 (CSS-first config)|
| PWA                 | `vite-plugin-pwa` (Workbox)       |
| Icons               | `lucide-react`                    |
| Backend / DB / Auth | Supabase (Postgres + pgvector)    |
| Edge compute        | Supabase Edge Functions (Deno)    |
| AI / NLP            | LLM via Edge Functions (Step 6)   |
| Hosting             | Vercel                            |
| Source control      | GitHub                            |

---

## Prerequisites

- **Node.js** ≥ 20.x — verify with `node -v`
- **npm** ≥ 10.x (or `pnpm` / `yarn` if you prefer; commands below use npm)
- A free **GitHub** account
- A free **Supabase** account → https://supabase.com
- A free **Vercel** account → https://vercel.com (sign in with GitHub)

---

## Quick start (TL;DR)

```bash
# 1. Install
npm install

# 2. Add Supabase keys
cp .env.example .env.local
# then edit .env.local with your project URL and anon key

# 3. Boot
npm run dev
```

Open http://localhost:5173 — you should see the landing page with a **Supabase connected** badge.

---

## Detailed setup

### 1. Local install

```bash
git clone <your-fork-or-this-zip-unpacked>
cd arabic-app
npm install
```

If npm complains about peer deps, run `npm install --legacy-peer-deps` once — the Tailwind v4 beta pulls in some pre-release peers.

### 2. Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Pick an organization, name the project (e.g. `arabic-reader`), choose a strong DB password, and select the region nearest to your users (for you in Karachi, **Singapore (`ap-southeast-1`)** or **Mumbai (`ap-south-1`)** is fastest).
3. Wait ~2 minutes for provisioning.
4. Once ready, go to **Project Settings → Data API** (sidebar). Copy these two values:
   - **Project URL** → `https://xxxxxxxxxxxx.supabase.co`
   - **Project API keys** → `anon` `public` key (the long JWT)
5. **Enable pgvector** (we'll use it in Step 11 for semantic search):
   - Sidebar → **Database → Extensions**
   - Search for `vector`, toggle it on.

> **Heads-up on keys:** the `anon` key is meant to be exposed to browsers — it's safe in `VITE_*` env vars. **Never** put the `service_role` key in any `VITE_*` variable or commit it; it bypasses Row Level Security.

### 3. Environment variables

Copy the template and fill it in:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-long-anon-key
```

`.env.local` is already in `.gitignore` — it will never be committed.

### 4. Fonts (optional but recommended)

The aesthetic relies on three fonts. Without them, you'll see system font fallbacks (still readable, just less distinctive).

See [`public/fonts/README.md`](./public/fonts/README.md) for the exact files to drop in. TL;DR: download Amiri, Reem Kufi, and Fraunces from Google Fonts, convert to WOFF2, place in `/public/fonts/`.

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:5173.

You should see:
- **Paper-cream background** (not white) — if it's white, Tailwind isn't loading; check that `import './styles/globals.css'` is in `main.tsx`.
- **Top-right badge: "Supabase connected"** — if it says "Configure .env.local", your env vars aren't being picked up. Restart `npm run dev` after editing `.env.local`.
- A **rotating Arabic sample sentence** with three colored highlight states demonstrating the word-state system.

#### Other useful commands

```bash
npm run build       # production build → dist/
npm run preview     # serve the production build locally
npm run typecheck   # tsc --noEmit, useful before pushing
npm run lint        # eslint (config TBD in Step 2)
```

---

## Deployment

### GitHub

If you haven't created the repo yet:

```bash
# Install gh CLI if you don't have it: https://cli.github.com/
gh auth login
gh repo create arabic-app --private --source=. --remote=origin --push
```

Or manually:

```bash
git init
git add .
git commit -m "step 1: foundation"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/arabic-app.git
git push -u origin main
```

### Vercel

1. Go to https://vercel.com/new
2. Click **Import Project** → select your `arabic-app` repo.
3. Framework preset: **Vite** (auto-detected — confirms `vercel.json`).
4. Expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
5. Click **Deploy**.

You get a live URL like `arabic-app-xyz.vercel.app` in ~60 seconds. Every push to `main` redeploys; every PR gets its own preview URL.

#### Custom domain (optional)

Vercel → your project → **Settings → Domains** → add your domain. Vercel issues a free TLS cert automatically.

---

## Project structure

```
arabic-app/
├── public/
│   ├── favicon.svg
│   ├── icon-192.png, icon-512.png, icon-512-maskable.png
│   ├── apple-touch-icon.png
│   └── fonts/                    # drop .woff2 files here
├── src/
│   ├── main.tsx                  # entry point
│   ├── App.tsx                   # landing page (replaced in Step 4 with router)
│   ├── vite-env.d.ts             # env var types
│   ├── lib/
│   │   ├── supabase.ts           # client singleton
│   │   └── arabic.ts             # tokenizer, diacritic helpers
│   ├── types/
│   │   └── database.ts           # generated from Supabase schema (Step 2)
│   ├── styles/
│   │   └── globals.css           # Tailwind v4 theme + Arabic typography
│   ├── components/ui/            # buttons, modals (built as needed)
│   ├── features/
│   │   ├── auth/                 # Step 3
│   │   ├── library/              # Step 4
│   │   ├── reader/               # Step 5 — the heart
│   │   ├── mining/               # Step 7
│   │   ├── review/               # Step 8
│   │   └── notebook/             # Step 11
│   ├── hooks/
│   └── routes/                   # router added in Step 3
├── supabase/
│   ├── migrations/               # SQL migrations (Step 2)
│   └── functions/                # Edge Functions (Step 6)
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── vercel.json
├── vite.config.ts
└── README.md
```

### Why feature-first folders?

Each capability (auth, library, reader, mining, review, notebook) lives in `src/features/<name>/` with its own components, hooks, and queries. Shared primitives go in `src/lib`, `src/components/ui`, `src/hooks`. This scales cleanly past 50+ files without the "where does this go?" problem.

---

## What's next (roadmap)

| Step | Title                          | What lands                                                                 |
| ---- | ------------------------------ | -------------------------------------------------------------------------- |
| 1    | **Foundation** ← *you are here* | Vite + React + Tailwind + PWA + Supabase client + design system           |
| 2    | Database schema                | `texts`, `tokens`, `vocabulary`, `sentences`, `cards`, `reviews`, RLS      |
| 3    | Auth                           | Email + magic link, protected routes, profile bootstrap                   |
| 4    | Library                        | Upload/paste text, list view, metadata, sorting                           |
| 5    | Reader core                    | Tokenizer, RTL layout, word highlighting, tap-to-define modal             |
| 6    | Edge Functions                 | `analyze-word`, `translate-sentence`, `mine-card` via LLM                 |
| 7    | Sentence mining                | One-tap card creation, chunk + cloze cards, mining queue                  |
| 8    | SRS engine                     | FSRS scheduler, review queue, smart difficulty                            |
| 9    | Exposure tracking              | Auto-acquired detection from natural re-encounters                        |
| 10   | Listening + sync               | Audio upload, Whisper word-level alignment, karaoke view                  |
| 11   | Notebook layer                 | pgvector embeddings, per-text AI Q&A                                      |
| 12   | Polish + PWA                   | Offline reader, install prompts, share targets                            |

Each step ships as a self-contained commit you can review and deploy independently.

---

## Design principles

These come from the original product spec and apply to every decision:

1. **Optimize for meaningful exposure.** If a feature adds clicks but not comprehension, cut it.
2. **Acquisition, not memorization.** SRS reinforces input; it doesn't replace it.
3. **Calm academia.** Warm paper, deep ink, restrained accents. No purple gradients, no childish bounces, no dopamine loops.
4. **Arabic first.** Roots, morphology, RTL, tashkeel — all treated as primary, not accommodated.
5. **Low friction over feature density.** A reader that lets you stay in flow beats one with twelve sidebars.

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Acknowledgements

Conceptual debts: **LingQ** (reading workflow), **Anki** (spaced repetition), **Refold** (sentence mining philosophy), **NotebookLM** (knowledge layer), and the broader **second language acquisition** research community.

<div dir="rtl" style="text-align: right; font-family: 'Amiri', serif; font-size: 1.2rem; margin-top: 2rem;">
وَقُل رَبِّ زِدْنِي عِلْمًا
</div>
