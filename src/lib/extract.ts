/**
 * Browser-side text extraction from PDF and EPUB files.
 *
 * PDF  → pdfjs-dist (Mozilla's PDF.js)
 * EPUB → epubjs
 *
 * Both run entirely in the browser — no server upload, no Edge Function.
 * Extracted text is handed to the same createText() flow as pasted text.
 *
 * The heavy parser libraries are dynamically imported INSIDE each function,
 * so they only download when a user actually uploads that file type. This
 * keeps the initial app bundle small for people who only paste text.
 *
 * NOTE on Arabic PDFs: pdfjs extracts the text layer if one exists (true for
 * most digital PDFs). Scanned/image-only PDFs have no text layer and will
 * return little or nothing — those need OCR, which is a later feature.
 */

export interface ExtractResult {
  title: string
  content: string
  /** Rough warning if extraction looks empty (e.g. scanned PDF). */
  warning?: string
}

/** Strip a file extension for use as a default title. */
function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').trim() || 'Untitled'
}

/**
 * Normalize extracted text: convert invisible/exotic spaces to regular spaces,
 * collapse runs of whitespace, and trim. This is critical for uploaded files —
 * PDFs and EPUBs frequently insert non-breaking spaces, zero-width spaces, and
 * other characters that would otherwise break word tokenization in the reader.
 */
export function cleanText(raw: string): string {
  return raw
    // Normalize all exotic spaces to a normal space
    .replace(/[\u00A0\u202F\u2060\uFEFF\u2007\u2009]/g, ' ')
    // Remove zero-width characters entirely
    .replace(/[\u200B\u200C\u200D]/g, '')
    // Normalize line endings
    .replace(/\r\n?/g, '\n')
    // Collapse 3+ newlines to a paragraph break
    .replace(/\n{3,}/g, '\n\n')
    // Collapse runs of spaces/tabs (but keep newlines)
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

// ─── PDF ─────────────────────────────────────────────────────────────────

export async function extractPdf(file: File): Promise<ExtractResult> {
  const pdfjsLib = await import('pdfjs-dist')
  // Point pdf.js at its worker. Vite resolves this URL at build time.
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) pages.push(pageText)
  }

  const content = cleanText(pages.join('\n\n'))
  const warning =
    content.length < 20
      ? 'Almost no text was found. This may be a scanned PDF (image-only), which needs OCR — not yet supported.'
      : undefined

  return { title: baseName(file.name), content, warning }
}

// ─── EPUB ────────────────────────────────────────────────────────────────

export async function extractEpub(file: File): Promise<ExtractResult> {
  const ePub = (await import('epubjs')).default

  const buf = await file.arrayBuffer()
  const book = ePub(buf)
  await book.ready

  let title = baseName(file.name)
  try {
    const meta = await book.loaded.metadata
    if (meta?.title) title = meta.title
  } catch {
    // keep filename-based title
  }

  const sections: string[] = []
  // @ts-expect-error — spine.items exists at runtime but isn't fully typed
  const items = book.spine?.items ?? []

  for (const item of items) {
    try {
      const doc = await book.load(item.href)
      const body = (doc as Document).body
      if (!body) continue
      const text = (body.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) sections.push(text)
    } catch {
      // skip unreadable section
    }
  }

  const content = cleanText(sections.join('\n\n'))
  const warning =
    content.length < 20 ? 'No readable text was found in this EPUB.' : undefined

  return { title, content, warning }
}

// ─── PDF rasterization (for OCR of scanned PDFs) ─────────────────────────

export interface RasterPage {
  /** base64 JPEG, no data: prefix */
  data: string
  pageNumber: number
}

/**
 * Render each PDF page to a base64 JPEG image, for OCR.
 * Used when a PDF has no extractable text layer (i.e. it's scanned).
 *
 * `scale` controls resolution — 2.0 is a good balance of legibility vs size.
 * `onProgress` reports rendering progress (not OCR progress).
 */
export async function rasterizePdf(
  file: File,
  opts: { scale?: number; maxPages?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<RasterPage[]> {
  const { scale = 2.0, maxPages = 30, onProgress } = opts

  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const total = Math.min(pdf.numPages, maxPages)
  const pages: RasterPage[] = []

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    await page.render({ canvasContext: ctx, viewport }).promise

    // JPEG keeps size manageable; 0.85 quality is plenty for OCR.
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const base64 = dataUrl.split(',')[1] ?? ''
    pages.push({ data: base64, pageNumber: i })

    onProgress?.(i, total)
  }

  return pages
}

/** Quick check: does this PDF have a usable text layer? */
export async function pdfHasTextLayer(file: File): Promise<boolean> {
  const result = await extractPdf(file)
  return result.content.replace(/\s/g, '').length >= 20
}

// ─── Dispatcher ────────────────────────────────────────────────────────────

export async function extractFile(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractPdf(file)
  }
  if (name.endsWith('.epub') || file.type === 'application/epub+zip') {
    return extractEpub(file)
  }
  if (name.endsWith('.txt') || file.type === 'text/plain') {
    const content = cleanText(await file.text())
    return { title: baseName(file.name), content }
  }
  throw new Error('Unsupported file type. Use PDF, EPUB, or TXT.')
}
