import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Upload, ScanText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { createText, deleteText, listTexts, ocrImages } from '@/lib/queries'
import { extractFile, rasterizePdf, pdfPageCount } from '@/lib/extract'
import type { Text } from '@/types/database'

export function LibraryPage() {
  const [texts, setTexts] = useState<Text[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    listTexts()
      .then(setTexts)
      .catch((e) => setError(e.message))
  }

  useEffect(() => { refresh() }, [])

  const onDelete = async (id: string) => {
    if (!confirm('Delete this text? Cards mined from it will stay.')) return
    await deleteText(id)
    refresh()
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-6 md:px-10 py-10 md:py-16">
      <div className="flex items-baseline justify-between mb-10 fade-up">
        <div>
          <p
            className="text-xs uppercase tracking-[0.22em] mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            Library
          </p>
          <h1
            className="text-3xl md:text-4xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              color: 'var(--color-ink)',
              letterSpacing: '-0.015em',
            }}
          >
            Your texts
          </h1>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={14} strokeWidth={1.5} />
          Add text
        </Button>
      </div>

      {error && (
        <p className="text-xs mb-6" style={{ color: '#a55432' }}>{error}</p>
      )}

      {texts === null ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Loading…</p>
      ) : texts.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} />
      ) : (
        <ul className="flex flex-col gap-3 fade-up fade-up-delay-1">
          {texts.map((t) => (
            <li key={t.id} className="card overflow-hidden group">
              <div className="flex items-stretch">
                <Link
                  to={`/library/${t.id}`}
                  className="flex-1 p-5 hover:bg-[var(--color-surface-sunk)] transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h3
                      className="text-base md:text-lg"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                      }}
                    >
                      {t.title}
                    </h3>
                    <span
                      className="text-xs whitespace-nowrap"
                      style={{ color: 'var(--color-ink-faint)' }}
                    >
                      {t.word_count} words
                    </span>
                  </div>
                  <p
                    className="arabic mt-2 line-clamp-1"
                    style={{
                      color: 'var(--color-ink-soft)',
                      fontSize: '0.95rem',
                      lineHeight: 1.7,
                    }}
                  >
                    {t.content.slice(0, 120)}
                  </p>
                </Link>
                <button
                  onClick={() => onDelete(t.id)}
                  className="px-4 hover:bg-[var(--color-surface-sunk)] transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 size={14} strokeWidth={1.5} color="var(--color-ink-faint)" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddTextDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => {
          setAdding(false)
          refresh()
        }}
      />
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card p-10 text-center fade-up fade-up-delay-1">
      <BookOpen
        size={28}
        strokeWidth={1.2}
        color="var(--color-ink-faint)"
        className="mx-auto mb-4"
      />
      <h3
        className="text-base mb-2"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          color: 'var(--color-ink)',
        }}
      >
        Nothing here yet
      </h3>
      <p
        className="text-sm mb-6 max-w-sm mx-auto"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        Paste in an Arabic article, story, or any text you'd like to read. The reader will tokenize it and let you tap any word.
      </p>
      <Button onClick={onAdd}>
        <Plus size={14} strokeWidth={1.5} /> Add your first text
      </Button>
    </div>
  )
}

function AddTextDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [tab, setTab] = useState<'paste' | 'upload'>('paste')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // OCR state
  const [scannedFile, setScannedFile] = useState<File | null>(null)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(10)

  useEffect(() => {
    if (open) {
      setTab('paste')
      setTitle('')
      setContent('')
      setError(null)
      setWarning(null)
      setFileName(null)
      setExtracting(false)
      setScannedFile(null)
      setOcrBusy(false)
      setOcrStatus(null)
      setPageCount(null)
      setStartPage(1)
      setEndPage(10)
    }
  }, [open])

  const onFilePicked = async (file: File) => {
    setError(null)
    setWarning(null)
    setScannedFile(null)
    setOcrStatus(null)
    setPageCount(null)
    setExtracting(true)
    setFileName(file.name)
    try {
      const result = await extractFile(file)
      setTitle((t) => t || result.title)
      setContent(result.content)
      if (result.warning) {
        setWarning(result.warning)
        // If it's a PDF that came back empty/scanned, offer OCR with a range.
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
        if (isPdf) {
          setScannedFile(file)
          try {
            const count = await pdfPageCount(file)
            setPageCount(count)
            setEndPage(Math.min(10, count))
          } catch {
            setPageCount(null)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file')
      setFileName(null)
    } finally {
      setExtracting(false)
    }
  }

  const runOcr = async () => {
    if (!scannedFile) return
    // Clamp the range
    const from = Math.max(1, Math.min(startPage, pageCount ?? startPage))
    const to = Math.max(from, Math.min(endPage, pageCount ?? endPage))
    if (to - from + 1 > 40) {
      setError('Please OCR at most 40 pages at a time to keep it fast and affordable.')
      return
    }

    setOcrBusy(true)
    setError(null)
    setWarning(null)
    try {
      setOcrStatus('Rendering pages…')
      const pages = await rasterizePdf(scannedFile, {
        scale: 2.0,
        startPage: from,
        endPage: to,
        onProgress: (done, total) => setOcrStatus(`Rendering page ${done} of ${total}…`),
      })

      // OCR in batches of 3 pages per request to keep payloads reasonable.
      const BATCH = 3
      const out: string[] = []
      for (let i = 0; i < pages.length; i += BATCH) {
        const batch = pages.slice(i, i + BATCH)
        const lo = from + i
        const hi = Math.min(from + i + BATCH - 1, to)
        setOcrStatus(`Reading pages ${lo}–${hi} of ${from}–${to}…`)
        const text = await ocrImages(batch.map((p) => p.data), 'image/jpeg')
        if (text) out.push(text)
      }

      const combined = out.join('\n\n').trim()
      if (!combined) {
        setError('OCR returned no text. The scan may be too low quality.')
      } else {
        setContent(combined)
        setScannedFile(null)
        setOcrStatus(`Done — read pages ${from}–${to}.`)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `OCR failed: ${err.message}`
          : 'OCR failed. Is the ocr-page function deployed?',
      )
    } finally {
      setOcrBusy(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) onFilePicked(file)
  }

  const submit = async () => {
    if (!content.trim()) {
      setError('Add some text first — paste it or upload a file.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const source = tab === 'upload' ? 'upload' : 'paste'
      await createText({ title: title || 'Untitled', content, source })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setBusy(false)
    }
  }

  const tabBtn = (id: 'paste' | 'upload', label: string) => (
    <button
      onClick={() => setTab(id)}
      className="text-xs uppercase tracking-[0.16em] pb-2 transition-colors"
      style={{
        color: tab === id ? 'var(--color-ink)' : 'var(--color-ink-faint)',
        borderBottom: tab === id ? '2px solid var(--color-accent)' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} title="Add text" maxWidth="600px">
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-[var(--color-border)] -mt-1">
          {tabBtn('paste', 'Paste')}
          {tabBtn('upload', 'Upload file')}
        </div>

        {/* Title (shared) */}
        <label className="flex flex-col gap-1.5">
          <span
            className="text-xs uppercase tracking-[0.14em]"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Surat Al-Kahf opening"
            className="px-3 py-2 text-sm rounded-sm border outline-none"
            style={{
              background: 'var(--color-paper)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
            }}
          />
        </label>

        {tab === 'paste' ? (
          <label className="flex flex-col gap-1.5">
            <span
              className="text-xs uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              Arabic text
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="ألصق النص العربي هنا..."
              dir="rtl"
              className="arabic px-3 py-3 rounded-sm border outline-none resize-y"
              style={{
                background: 'var(--color-paper)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
                fontSize: '1.05rem',
                lineHeight: 1.9,
                minHeight: '200px',
              }}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="flex flex-col items-center justify-center gap-2 py-10 px-4 rounded-sm border-2 border-dashed cursor-pointer transition-colors text-center hover:bg-[var(--color-surface-sunk)]"
              style={{ borderColor: 'var(--color-border-strong)' }}
            >
              <Upload size={20} strokeWidth={1.5} color="var(--color-ink-faint)" />
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                {extracting
                  ? 'Reading file…'
                  : fileName
                    ? fileName
                    : 'Click to choose, or drop a file here'}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                PDF, EPUB, or TXT
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.txt,application/pdf,application/epub+zip,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFilePicked(f)
              }}
            />

            {/* Preview of extracted text */}
            {content && !extracting && (
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-1.5"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  Preview · {content.split(/\s+/).filter(Boolean).length} words
                </p>
                <p
                  className="arabic px-3 py-3 rounded-sm border max-h-40 overflow-auto"
                  dir="rtl"
                  style={{
                    background: 'var(--color-paper)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-ink-soft)',
                    fontSize: '0.95rem',
                    lineHeight: 1.8,
                  }}
                >
                  {content.slice(0, 400)}
                  {content.length > 400 ? '…' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {warning && (
          <p
            className="text-xs p-3 rounded-sm"
            style={{
              background: 'rgba(180, 130, 70, 0.10)',
              color: 'var(--color-accent-deep)',
            }}
          >
            {warning}
          </p>
        )}

        {/* OCR offer for scanned PDFs */}
        {scannedFile && (
          <div
            className="flex flex-col gap-3 p-4 rounded-sm"
            style={{ background: 'var(--color-surface-sunk)' }}
          >
            <div className="flex items-start gap-2">
              <ScanText size={16} strokeWidth={1.5} color="var(--color-accent)" className="mt-0.5" />
              <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                Scanned PDF detected{pageCount ? ` · ${pageCount} pages` : ''}. Choose a page
                range and run Arabic OCR (Claude reads the images, preserving tashkeel).
                Costs roughly $0.02 per page, so start small.
              </p>
            </div>

            <div className="flex items-end gap-3 flex-wrap">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--color-ink-faint)' }}>
                  From page
                </span>
                <input
                  type="number"
                  min={1}
                  max={pageCount ?? 9999}
                  value={startPage}
                  onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={ocrBusy}
                  className="w-20 px-2 py-1.5 text-sm rounded-sm border outline-none"
                  style={{ background: 'var(--color-paper)', borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--color-ink-faint)' }}>
                  To page
                </span>
                <input
                  type="number"
                  min={1}
                  max={pageCount ?? 9999}
                  value={endPage}
                  onChange={(e) => setEndPage(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={ocrBusy}
                  className="w-20 px-2 py-1.5 text-sm rounded-sm border outline-none"
                  style={{ background: 'var(--color-paper)', borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
                />
              </label>
              <Button onClick={runOcr} disabled={ocrBusy} size="sm">
                <ScanText size={13} strokeWidth={1.5} />
                {ocrBusy ? 'Running OCR…' : `OCR ${Math.max(0, endPage - startPage + 1)} pages`}
              </Button>
            </div>
          </div>
        )}

        {ocrStatus && (
          <p
            className="text-xs flex items-center gap-2"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            {ocrBusy && (
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: 'var(--color-accent)' }}
              />
            )}
            {ocrStatus}
          </p>
        )}

        {error && <p className="text-xs" style={{ color: '#a55432' }}>{error}</p>}

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || extracting}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
