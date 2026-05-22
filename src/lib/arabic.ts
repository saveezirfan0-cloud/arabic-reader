/**
 * Arabic text utilities.
 */

// Arabic Unicode ranges
const ARABIC_LETTER_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

// Diacritics (tashkeel): fatha, kasra, damma, sukun, shadda, tanwin, etc.
const TASHKEEL_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g

// Word-break punctuation we split on. Includes ASCII whitespace (\s) plus
// invisible characters common in PDF/EPUB extraction: non-breaking space,
// zero-width space/joiner, narrow no-break space, etc.
const WORD_BREAK_RE =
  /([\s\u00A0\u200B\u200C\u200D\u202F\u2060\uFEFF\u060C\u061B\u061F.,!?؟،؛:"'()\[\]{}…—–\-«»]+)/

// Sentence-end punctuation: period, exclamation, Arabic question mark, Arabic full stop
const SENTENCE_END_RE = /([.!?؟])/g

export function hasArabic(str: string): boolean {
  return ARABIC_LETTER_RE.test(str)
}

export function stripTashkeel(str: string): string {
  return str.replace(TASHKEEL_RE, '')
}

/** Normalize Arabic for matching: strip tashkeel + unify alef/ya/ta-marbuta. */
export function normalizeArabic(str: string): string {
  return stripTashkeel(str)
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '') // tatweel
    .trim()
}

/**
 * Tokenize text into segments: { kind: 'word' | 'space', text }
 * Preserves whitespace + punctuation as separate tokens for accurate re-render.
 */
export interface Token {
  kind: 'word' | 'space'
  text: string
  /** The normalized lemma — for words only */
  lemma?: string
  /** Position in original text (start index) */
  start: number
}

export function tokenize(text: string): Token[] {
  const parts = text.split(WORD_BREAK_RE)
  const tokens: Token[] = []
  let pos = 0
  for (const part of parts) {
    if (part.length === 0) continue
    if (hasArabic(part)) {
      tokens.push({ kind: 'word', text: part, lemma: normalizeArabic(part), start: pos })
    } else {
      tokens.push({ kind: 'space', text: part, start: pos })
    }
    pos += part.length
  }
  return tokens
}

/**
 * Find the sentence a given token belongs to. Returns the full sentence as a string.
 * Splits on . ! ? ؟ and Arabic line breaks.
 */
export function findSentence(text: string, position: number): string {
  // Find sentence boundary BEFORE position
  let start = 0
  let end = text.length

  for (let i = position; i >= 0; i--) {
    const ch = text[i]
    if (ch && SENTENCE_END_RE.test(ch)) {
      start = i + 1
      break
    }
  }
  SENTENCE_END_RE.lastIndex = 0

  // Find sentence boundary AFTER position
  for (let i = position; i < text.length; i++) {
    const ch = text[i]
    if (ch && SENTENCE_END_RE.test(ch)) {
      end = i + 1
      break
    }
  }
  SENTENCE_END_RE.lastIndex = 0

  return text.slice(start, end).trim()
}
