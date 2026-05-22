import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCw, Check } from 'lucide-react'
import { listDueCards, reviewCard, countNewCards } from '@/lib/queries'
import type { Card } from '@/types/database'
import { Button } from '@/components/ui/Button'
import type { Rating } from '@/lib/srs'

export function ReviewPage() {
  const [queue, setQueue] = useState<Card[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [newCount, setNewCount] = useState<number | null>(null)

  useEffect(() => {
    listDueCards(50)
      .then(setQueue)
      .catch((e) => setError(e.message))
    countNewCards().then(setNewCount).catch(() => {})
  }, [])

  const current = queue?.[idx]

  const onRate = async (rating: Rating) => {
    if (!current || busy) return
    setBusy(true)
    try {
      await reviewCard(current, rating)
      setReviewedCount((c) => c + 1)
      setShowBack(false)
      setIdx((i) => i + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally { setBusy(false) }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!showBack) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          setShowBack(true)
        }
        return
      }
      if (e.key === '1') onRate(0)
      else if (e.key === '2') onRate(1)
      else if (e.key === '3') onRate(2)
      else if (e.key === '4') onRate(3)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBack, current, busy])

  if (error) return <CenterStatus>{error}</CenterStatus>
  if (queue === null) return <CenterStatus>Loading…</CenterStatus>

  if (queue.length === 0 || !current) {
    return (
      <div className="max-w-md w-full mx-auto px-6 py-16 text-center fade-up">
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] mb-12 hover:text-[var(--color-ink)] transition-colors"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          Library
        </Link>

        <Check
          size={32}
          strokeWidth={1.2}
          color="var(--color-accent)"
          className="mx-auto mb-4"
        />
        <h1
          className="text-2xl mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {reviewedCount > 0 ? 'All done.' : 'Nothing due.'}
        </h1>
        <p
          className="text-sm"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          {reviewedCount > 0
            ? `Reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}. Come back tomorrow.`
            : newCount && newCount > 0
              ? `Mine some sentences from your library to start reviewing.`
              : 'Open a text and tap "Mine sentence" on any word.'}
        </p>
        <div className="mt-8">
          <Link to="/library">
            <Button variant="ghost">Back to library</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl w-full mx-auto px-6 md:px-10 py-8 md:py-12">
      {/* Top bar with progress */}
      <div className="flex items-center justify-between mb-12">
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] hover:text-[var(--color-ink)] transition-colors"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          Library
        </Link>
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          {idx + 1} / {queue.length}
        </p>
      </div>

      {/* Card */}
      <div className="card p-8 md:p-12 min-h-[300px] flex flex-col justify-center fade-up" key={current.id}>
        <p
          className="arabic text-center"
          style={{
            fontSize: '1.75rem',
            lineHeight: 2,
            color: 'var(--color-ink)',
          }}
        >
          {current.front}
        </p>

        {showBack && (
          <>
            <div className="rule my-8" />
            <div className="text-center fade-up" style={{ color: 'var(--color-ink-soft)' }}>
              {current.back.split('\n\n').map((para, i) => (
                <p
                  key={i}
                  className={i === 0 ? 'text-base font-medium mb-2' : 'text-sm italic'}
                  style={{ color: i === 0 ? 'var(--color-ink)' : 'var(--color-ink-soft)' }}
                >
                  {para}
                </p>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8">
        {!showBack ? (
          <div className="flex justify-center">
            <Button onClick={() => setShowBack(true)} size="lg">
              <RotateCw size={14} strokeWidth={1.5} />
              Show answer
              <span
                className="text-[10px] uppercase tracking-wider opacity-60 ml-2"
              >
                Space
              </span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 fade-up">
            <RatingButton rating={0} label="Again" hotkey="1" onClick={onRate} disabled={busy} />
            <RatingButton rating={1} label="Hard"  hotkey="2" onClick={onRate} disabled={busy} />
            <RatingButton rating={2} label="Good"  hotkey="3" onClick={onRate} disabled={busy} />
            <RatingButton rating={3} label="Easy"  hotkey="4" onClick={onRate} disabled={busy} />
          </div>
        )}
      </div>
    </div>
  )
}

function RatingButton({
  rating,
  label,
  hotkey,
  onClick,
  disabled,
}: {
  rating: Rating
  label: string
  hotkey: string
  onClick: (r: Rating) => void
  disabled: boolean
}) {
  const colors: Record<Rating, string> = {
    0: '#a55432',
    1: 'var(--color-accent)',
    2: 'var(--color-ink)',
    3: 'var(--color-accent-deep)',
  }
  return (
    <button
      onClick={() => onClick(rating)}
      disabled={disabled}
      className="flex flex-col items-center gap-1 py-3 rounded-sm border transition disabled:opacity-50 hover:bg-[var(--color-surface-sunk)]"
      style={{
        borderColor: 'var(--color-border-strong)',
        color: colors[rating],
      }}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-60">{hotkey}</span>
    </button>
  )
}

function CenterStatus({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
        {children}
      </p>
    </div>
  )
}
