// ============================================================================
// ocr-page  —  Supabase Edge Function
//
// Receives: { images: string[] }  where each is a base64 PNG/JPEG data string
//           (without the "data:image/png;base64," prefix)
// Returns:  { text: string }  — transcribed Arabic, tashkeel preserved
//
// Uses Claude's vision capability to OCR scanned Arabic pages. Claude handles
// RTL, connected letters, and diacritics far better than classic OCR engines.
//
// Secret needed: ANTHROPIC_API_KEY  (same one used by analyze-word)
// ============================================================================

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
// Vision works best on a stronger model; Sonnet balances quality + cost.
// Dated string is the most reliable across API accounts.
const MODEL = 'claude-sonnet-4-5-20250929'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface OcrRequest {
  images: string[]      // base64, no data: prefix
  mediaType?: string    // 'image/png' (default) or 'image/jpeg'
}

const SYSTEM_PROMPT = `You are an expert Arabic OCR engine. You receive one or more images of a page from an Arabic book or document.

Transcribe ALL Arabic text you see, exactly as written. Rules:
- Preserve tashkeel (diacritics: fatha, kasra, damma, sukun, shadda, tanwin) wherever they appear in the image. Do NOT add diacritics that aren't there, and do NOT remove ones that are.
- Preserve paragraph breaks. Use a blank line between paragraphs.
- Read right-to-left, top-to-bottom, as Arabic is naturally read.
- Do NOT translate. Do NOT explain. Do NOT add commentary, page numbers you invent, or notes.
- If a page has headers, footnotes, or page numbers that are part of the scan, include them only if they are clearly body text; skip obvious page furniture.
- If you cannot read part of the text, transcribe what you can and skip the illegible part rather than guessing wildly.

Output ONLY the transcribed Arabic text. No preamble, no code fences.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return jsonError('Server missing ANTHROPIC_API_KEY secret', 500)
    }

    const { images, mediaType = 'image/png' }: OcrRequest = await req.json()
    if (!Array.isArray(images) || images.length === 0) {
      return jsonError('Missing "images" array', 400)
    }
    if (images.length > 5) {
      return jsonError('Send at most 5 images per request', 400)
    }

    // Build the content array: all images, then the instruction.
    const content: unknown[] = images.map((data) => ({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data },
    }))
    content.push({
      type: 'text',
      text: 'Transcribe the Arabic text from these page image(s), preserving tashkeel.',
    })

    const aResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!aResp.ok) {
      const errText = await aResp.text()
      console.error('Anthropic error:', aResp.status, errText)
      return jsonError(`Anthropic API error: ${aResp.status}`, 502)
    }

    const data = await aResp.json()
    const text = (data.content ?? [])
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('\n')
      .trim()

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('ocr-page error:', err)
    return jsonError(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
