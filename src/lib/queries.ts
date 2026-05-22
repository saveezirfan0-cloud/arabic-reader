/**
 * Centralized query layer. All Supabase reads/writes go through here so the
 * UI never imports the client directly. Easier to mock, refactor, or migrate.
 */
import { supabase } from './supabase'
import type { Card, Text, Vocabulary, WordState } from '@/types/database'
import { normalizeArabic } from './arabic'
import { cleanText } from './extract'
import { schedule, type Rating, type SrsState } from './srs'

// ─── Texts ──────────────────────────────────────────────────────────────────

export async function listTexts(): Promise<Text[]> {
  const { data, error } = await supabase
    .from('texts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getText(id: string): Promise<Text | null> {
  const { data, error } = await supabase.from('texts').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createText(input: {
  title: string
  content: string
  source?: string
}): Promise<Text> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const content = cleanText(input.content)
  const word_count = content.split(/\s+/).filter((w) => w.length > 0).length

  const { data, error } = await supabase
    .from('texts')
    .insert({
      user_id: user.id,
      title: input.title.trim() || 'Untitled',
      content,
      source: input.source ?? 'paste',
      word_count,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteText(id: string): Promise<void> {
  const { error } = await supabase.from('texts').delete().eq('id', id)
  if (error) throw error
}

export async function updateLastPosition(id: string, position: number) {
  const { error } = await supabase
    .from('texts')
    .update({ last_position: position })
    .eq('id', id)
  if (error) throw error
}

// ─── Vocabulary ────────────────────────────────────────────────────────────

/** Returns a map of lemma → state for all vocab the user has touched. */
export async function loadVocabularyMap(): Promise<Map<string, Vocabulary>> {
  const { data, error } = await supabase.from('vocabulary').select('*')
  if (error) throw error
  const map = new Map<string, Vocabulary>()
  for (const v of data ?? []) map.set(v.lemma, v)
  return map
}

export async function getOrCreateVocab(input: {
  surface: string
  state?: WordState
}): Promise<Vocabulary> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const lemma = normalizeArabic(input.surface)

  // Try to find existing first
  const { data: existing } = await supabase
    .from('vocabulary')
    .select('*')
    .eq('user_id', user.id)
    .eq('lemma', lemma)
    .maybeSingle()

  if (existing) {
    // Bump encounter count + last_seen
    const { data: updated, error } = await supabase
      .from('vocabulary')
      .update({
        encounter_count: existing.encounter_count + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return updated
  }

  const { data: created, error } = await supabase
    .from('vocabulary')
    .insert({
      user_id: user.id,
      lemma,
      surface: input.surface,
      state: input.state ?? 'unknown',
    })
    .select()
    .single()
  if (error) throw error
  return created
}

export async function enrichVocab(
  id: string,
  patch: Partial<Pick<Vocabulary, 'root' | 'definition' | 'translation' | 'pos' | 'morphology'>>,
): Promise<Vocabulary> {
  const { data, error } = await supabase
    .from('vocabulary')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setWordState(id: string, state: WordState): Promise<Vocabulary> {
  const { data, error } = await supabase
    .from('vocabulary')
    .update({ state })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Cards ─────────────────────────────────────────────────────────────────

export async function createSentenceCard(input: {
  vocabulary_id: string
  text_id: string | null
  sentence: string
  word: string
  translation: string
  sentence_translation: string
}): Promise<Card> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Front = the Arabic sentence (highlighting handled in UI)
  // Back  = sentence translation + word translation
  const front = input.sentence
  const back = `${input.word} — ${input.translation}\n\n${input.sentence_translation}`

  const { data, error } = await supabase
    .from('cards')
    .insert({
      user_id: user.id,
      vocabulary_id: input.vocabulary_id,
      text_id: input.text_id,
      type: 'sentence',
      front,
      back,
      sentence_context: input.sentence,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listDueCards(limit = 50): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('suspended', false)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function countDueCards(): Promise<number> {
  const { count, error } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('suspended', false)
    .lte('next_review_at', new Date().toISOString())
  if (error) throw error
  return count ?? 0
}

export async function countNewCards(): Promise<number> {
  const { count, error } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .is('last_reviewed_at', null)
  if (error) throw error
  return count ?? 0
}

// ─── Mining inbox ────────────────────────────────────────────────────────

export type CardFilter = 'all' | 'due' | 'new' | 'learning' | 'mastered' | 'suspended'

/** A card joined with its source text title (for the inbox list). */
export interface CardWithText extends Card {
  text_title: string | null
}

export async function listAllCards(filter: CardFilter = 'all'): Promise<CardWithText[]> {
  let query = supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false })

  const nowIso = new Date().toISOString()

  if (filter === 'due') {
    query = query.eq('suspended', false).lte('next_review_at', nowIso)
  } else if (filter === 'new') {
    query = query.is('last_reviewed_at', null)
  } else if (filter === 'suspended') {
    query = query.eq('suspended', true)
  } else if (filter === 'mastered') {
    query = query.gte('interval_days', 21).eq('suspended', false)
  } else if (filter === 'learning') {
    query = query.not('last_reviewed_at', 'is', null).lt('interval_days', 21).eq('suspended', false)
  }

  const { data: cards, error } = await query
  if (error) throw error
  if (!cards || cards.length === 0) return []

  // Fetch the titles of the source texts in one query, then map them in.
  const textIds = [...new Set(cards.map((c) => c.text_id).filter(Boolean))] as string[]
  const titleMap = new Map<string, string>()
  if (textIds.length > 0) {
    const { data: texts } = await supabase
      .from('texts')
      .select('id, title')
      .in('id', textIds)
    for (const t of texts ?? []) titleMap.set(t.id, t.title)
  }

  return cards.map((card) => ({
    ...card,
    text_title: card.text_id ? titleMap.get(card.text_id) ?? null : null,
  }))
}

export interface CardStats {
  total: number
  due: number
  new: number
  learning: number
  mastered: number
  suspended: number
}

export async function getCardStats(): Promise<CardStats> {
  const nowIso = new Date().toISOString()
  const head = { count: 'exact' as const, head: true }

  const [total, due, fresh, mastered, suspended] = await Promise.all([
    supabase.from('cards').select('*', head),
    supabase.from('cards').select('*', head).eq('suspended', false).lte('next_review_at', nowIso),
    supabase.from('cards').select('*', head).is('last_reviewed_at', null),
    supabase.from('cards').select('*', head).gte('interval_days', 21).eq('suspended', false),
    supabase.from('cards').select('*', head).eq('suspended', true),
  ])

  const totalC = total.count ?? 0
  const newC = fresh.count ?? 0
  const masteredC = mastered.count ?? 0
  const suspendedC = suspended.count ?? 0
  // learning = everything not new, not mastered, not suspended
  const learningC = Math.max(0, totalC - newC - masteredC - suspendedC)

  return {
    total: totalC,
    due: due.count ?? 0,
    new: newC,
    learning: learningC,
    mastered: masteredC,
    suspended: suspendedC,
  }
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw error
}

export async function setCardSuspended(id: string, suspended: boolean): Promise<void> {
  const { error } = await supabase.from('cards').update({ suspended }).eq('id', id)
  if (error) throw error
}

export async function reviewCard(card: Card, rating: Rating): Promise<Card> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const state: SrsState = {
    ease_factor: Number(card.ease_factor),
    interval_days: card.interval_days,
    repetitions: card.repetitions,
  }
  const next = schedule(state, rating)

  // Update card
  const { data: updated, error: cardErr } = await supabase
    .from('cards')
    .update({
      ease_factor: next.ease_factor,
      interval_days: next.interval_days,
      repetitions: next.repetitions,
      next_review_at: next.next_review_at.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', card.id)
    .select()
    .single()
  if (cardErr) throw cardErr

  // Log review
  const { error: revErr } = await supabase.from('reviews').insert({
    card_id: card.id,
    user_id: user.id,
    rating,
    ease_before: state.ease_factor,
    ease_after: next.ease_factor,
    interval_after: next.interval_days,
  })
  if (revErr) throw revErr

  return updated
}

// ─── AI ────────────────────────────────────────────────────────────────────

export interface WordAnalysis {
  lemma: string
  root: string | null
  definition: string
  translation: string
  pos: string
  morphology: Record<string, unknown>
  sentence_translation: string
}

export async function analyzeWord(word: string, sentence: string): Promise<WordAnalysis> {
  const { data, error } = await supabase.functions.invoke<WordAnalysis>('analyze-word', {
    body: { word, sentence },
  })
  if (error) throw error
  if (!data) throw new Error('Empty response from analyze-word')
  return data
}
