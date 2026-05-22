import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BookOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { createText, deleteText, listTexts } from '@/lib/queries'
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
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setContent('')
      setError(null)
    }
  }, [open])

  const submit = async () => {
    if (!content.trim()) {
      setError('Paste some Arabic text first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createText({ title: title || 'Untitled', content })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add text" maxWidth="600px">
      <div className="flex flex-col gap-4">
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

        {error && <p className="text-xs" style={{ color: '#a55432' }}>{error}</p>}

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
