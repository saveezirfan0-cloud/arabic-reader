-- ============================================================================
-- Arabic Reader — initial schema
-- ============================================================================
-- Tables: profiles, texts, vocabulary, cards, reviews
-- All tables protected by Row Level Security (RLS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles  — extends auth.users with app-specific data
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  daily_review_target int not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- texts  — a piece of reading material
-- ----------------------------------------------------------------------------
create table public.texts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  source text not null default 'paste',  -- 'paste' | 'pdf' | 'epub' | 'url'
  language text not null default 'ar',
  word_count int not null default 0,
  last_position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index texts_user_created_idx on public.texts (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- vocabulary  — per-user word state (lemma-level)
-- ----------------------------------------------------------------------------
create type word_state as enum ('unknown', 'learning', 'known', 'ignored');

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lemma text not null,                   -- normalized form (no tashkeel, alef unified)
  surface text,                          -- original surface form when first seen
  state word_state not null default 'unknown',
  root text,                             -- e.g. "ع ل م"
  definition text,
  translation text,                      -- short English gloss
  pos text,                              -- part of speech: noun, verb, etc.
  morphology jsonb,                      -- flexible bag for forms, tenses, etc.
  encounter_count int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, lemma)
);

create index vocabulary_user_state_idx on public.vocabulary (user_id, state);
create index vocabulary_user_lemma_idx on public.vocabulary (user_id, lemma);

-- ----------------------------------------------------------------------------
-- cards  — SRS cards (sentence-mining-style)
-- ----------------------------------------------------------------------------
create type card_type as enum ('sentence', 'word', 'cloze');

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid references public.vocabulary(id) on delete cascade,
  text_id uuid references public.texts(id) on delete set null,
  type card_type not null default 'sentence',
  front text not null,
  back text not null,
  sentence_context text,
  -- SM-2 fields
  ease_factor numeric(4,2) not null default 2.50,
  interval_days int not null default 0,
  repetitions int not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create index cards_user_due_idx
  on public.cards (user_id, next_review_at)
  where suspended = false;

-- ----------------------------------------------------------------------------
-- reviews  — log of each review event (for stats + algorithm tuning)
-- ----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 0 and 3),  -- 0=again 1=hard 2=good 3=easy
  ease_before numeric(4,2),
  ease_after numeric(4,2),
  interval_after int,
  reviewed_at timestamptz not null default now()
);

create index reviews_card_idx on public.reviews (card_id, reviewed_at desc);
create index reviews_user_idx on public.reviews (user_id, reviewed_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.texts       enable row level security;
alter table public.vocabulary  enable row level security;
alter table public.cards       enable row level security;
alter table public.reviews     enable row level security;

-- profiles: user can see + update their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- texts: full CRUD on own rows
create policy "texts_all_own" on public.texts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- vocabulary: full CRUD on own rows
create policy "vocabulary_all_own" on public.vocabulary
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cards: full CRUD on own rows
create policy "cards_all_own" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reviews: insert + select own rows (no update — reviews are append-only history)
create policy "reviews_select_own" on public.reviews
  for select using (auth.uid() = user_id);
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger texts_updated_at before update on public.texts
  for each row execute function public.set_updated_at();
