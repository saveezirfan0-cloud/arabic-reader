// ============================================================================
// analyze-word  —  Supabase Edge Function
//
// Receives: { word: string, sentence: string }
// Returns:  { lemma, root, definition, translation, pos, morphology, sentence_translation }
//
// Calls Anthropic's Claude (Haiku 4.5) with a structured prompt.
// Auth: JWT verified automatically by Supabase Edge Functions.
// Secret needed: ANTHROPIC_API_KEY
// ============================================================================

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-haiku-4-5-20251001'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AnalyzeRequest {
  word: string
  sentence: string
}

interface AnalyzeResponse {
  lemma: string
  root: string | null
  definition: string
  translation: string
  pos: string
  plural: string | null
  synonyms: string[]
  antonyms: string[]
  senses: string[]
  morphology: Record<string, unknown>
  sentence_translation: string
}

const SYSTEM_PROMPT = `You are an expert Arabic linguist helping a learner read Modern Standard Arabic (MSA).

For each request you receive:
- The "word" — an Arabic word the learner just tapped on
- The "sentence" — the sentence it appeared in

Respond with a JSON object describing the word, with these exact keys:
{
  "lemma": "the dictionary form (no diacritics), e.g. كَتَبَ for كتب",
  "root": "the trilateral/quadrilateral root in this exact format: 'ك ت ب' (letters separated by spaces). null if not applicable.",
  "definition": "a clear English definition, 1-2 short sentences max",
  "translation": "a single best English word/phrase for this word",
  "pos": "one of: noun, verb, adjective, adverb, particle, pronoun, preposition, conjunction, interjection",
  "plural": "for nouns/adjectives: the Arabic broken or sound plural WITH diacritics, e.g. كُتُب. null if not a noun/adjective or no common plural.",
  "synonyms": ["up to 4 Arabic synonyms (مُرادِفات) WITH diacritics. Empty array if none."],
  "antonyms": ["up to 3 Arabic antonyms (أضْداد) WITH diacritics. Empty array if none."],
  "senses": ["up to 4 distinct meanings/senses (مَعانٍ) of the word, each a short English phrase. Empty array if only one sense."],
  "morphology": {
    "form": "for verbs, the form number (I-X) or null",
    "tense": "for verbs: past/present/imperative or null",
    "person": "1st/2nd/3rd or null",
    "number": "singular/dual/plural or null",
    "gender": "masculine/feminine or null"
  },
  "sentence_translation": "a natural English translation of the entire sentence"
}

Always use proper Arabic diacritics (tashkeel) on the synonyms, antonyms, and plural.
Only output the JSON object. No prose. No code fences.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return jsonError('Server missing ANTHROPIC_API_KEY secret', 500)
    }

    const { word, sentence }: AnalyzeRequest = await req.json()
    if (!word || typeof word !== 'string') {
      return jsonError('Missing "word" string', 400)
    }
    if (!sentence || typeof sentence !== 'string') {
      return jsonError('Missing "sentence" string', 400)
    }

    const userMessage = JSON.stringify({ word, sentence })

    const aResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!aResp.ok) {
      const errText = await aResp.text()
      console.error('Anthropic error:', aResp.status, errText)
      return jsonError(`Anthropic API error: ${aResp.status}`, 502)
    }

    const data = await aResp.json()
    const textBlock = data.content?.find((c: { type: string }) => c.type === 'text')
    if (!textBlock?.text) {
      return jsonError('Empty response from model', 502)
    }

    // Claude should return pure JSON; strip code fences just in case.
    const cleaned = String(textBlock.text)
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed: AnalyzeResponse
    try {
      parsed = JSON.parse(cleaned)
    } catch (_e) {
      console.error('Failed to parse model JSON:', cleaned)
      return jsonError('Model returned invalid JSON', 502)
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('analyze-word error:', err)
    return jsonError(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
