/**
 * Arabic text utilities.
 *
 * This file stays intentionally small for Step 1 — full tokenization + morphology
 * handling lands in Step 5 (reader) and Step 6 (Edge Functions). For now we expose
 * just the primitives the landing page + future code will need.
 */

// Arabic Unicode ranges:
//   U+0600–U+06FF  Arabic
//   U+0750–U+077F  Arabic Supplement
//   U+08A0–U+08FF  Arabic Extended-A
//   U+FB50–U+FDFF  Arabic Presentation Forms-A
//   U+FE70–U+FEFF  Arabic Presentation Forms-B
const ARABIC_LETTER_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

// Diacritics (tashkeel): fatha, kasra, damma, sukun, shadda, tanwin, etc.
const TASHKEEL_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g

/** True if the string contains any Arabic letter. */
export function hasArabic(str: string): boolean {
  return ARABIC_LETTER_RE.test(str)
}

/** Strip tashkeel (diacritics). Useful for matching against dictionary lemmas. */
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
}

/**
 * Naive word tokenizer for Arabic text. Splits on whitespace + punctuation.
 * Step 5 will replace this with a proper sentence-aware tokenizer.
 */
export function tokenize(text: string): string[] {
  return text
    .split(/[\s\u060C\u061B\u061F.,!?؟،؛:"'()\[\]{}…—–-]+/)
    .filter((t) => t.length > 0 && hasArabic(t))
}
