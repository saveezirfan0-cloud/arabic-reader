-- ============================================================================
-- Add richer lexical fields to vocabulary
-- synonyms / antonyms / senses stored as JSONB arrays; plural as text.
-- ============================================================================

alter table public.vocabulary
  add column if not exists plural text,
  add column if not exists synonyms jsonb not null default '[]'::jsonb,
  add column if not exists antonyms jsonb not null default '[]'::jsonb,
  add column if not exists senses jsonb not null default '[]'::jsonb;
