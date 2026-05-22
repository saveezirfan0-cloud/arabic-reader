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

  const content = pages.join('\n\n')
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

  const content = sections.join('\n\n')
  const warning =
    content.length < 20 ? 'No readable text was found in this EPUB.' : undefined

  return { title, content, warning }
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
    const content = await file.text()
    return { title: baseName(file.name), content }
  }
  throw new Error('Unsupported file type. Use PDF, EPUB, or TXT.')
}
