import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, PauseCircle, PlayCircle, Layers } from 'lucide-react'
import {
  listAllCards,
  getCardStats,
  deleteCard,
  setCardSuspended,
  type CardWithText,
  type CardFilter,
  type CardStats,
} from '@/lib/queries'

const FILTERS: { id: CardFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'due', label: 'Due now' },
  { id: 'new', label: 'New' },
  { id: 'learning', label: 'Learning' },
  { id: 'mastered', label: 'Mastered' },
  { id: 'suspended', label: 'Suspended' },
]

export function MiningPage() {
  const [cards, setCards] = useState<CardWithText[] | null>(null)
  const [stats, setStats] = useState<CardStats | null>(null)
  const [filter, setFilter] = useState<CardFilter>('all')
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    listAllCards(filter).then(setCards).catch((e) => setError(e.message))
    getCardStats().then(setStats).catch(() => {})
  }

  useEffect(() => {
    setCards(null)
    listAllCards(filter).then(setCards).catch((e) => setError(e.message))
  }, [filter])

  useEffect(() => {
    getCardStats().then(setStats).catch(() => {})
  }, [])

  const onDelete = async (id: string) => {
    if (!confirm('Delete this card permanently?')) return
    await deleteCard(id)
    refresh()
  }

  const onToggleSuspend = async (card: CardWithText) => {
    await setCardSuspended(card.id, !card.suspended)
    refresh()
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-6 md:px-10 py-10 md:py-16">
      {/* Header */}
      <div className="mb-8 fade-up">
        <p
          className="text-xs uppercase tracking-[0.22em] mb-2"
          style={{ color: 'var(--color-accent)' }}
        >
          Mining
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
          Your sentences
        </h1>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8 fade-up fade-up-delay-1">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Due" value={stats.due} accent />
          <StatCard label="New" value={stats.new} />
          <StatCard label="Learning" value={stats.learning} />
          <StatCard label="Mastered" value={stats.mastered} />
          <StatCard label="Paused" value={stats.suspended} />
        </div>
      )}

      {/* Review CTA */}
      {stats && stats.due > 0 && (
        <Link to="/review" className="block mb-8 fade-up fade-up-delay-1">
          <div
            className="card p-4 flex items-center justify-between hover:bg-[var(--color-surface-sunk)] transition-colors"
            style={{ borderColor: 'var(--color-accent-soft)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
              {stats.due} card{stats.due === 1 ? '' : 's'} ready to review
            </span>
            <span
              className="text-xs uppercase tracking-[0.16em]"
              style={{ color: 'var(--color-accent)' }}
            >
              Review now →
            </span>
          </div>
        </Link>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 border-b border-[var(--color-border)] pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="text-xs uppercase tracking-[0.14em] transition-colors"
            style={{
              color: filter === f.id ? 'var(--color-ink)' : 'var(--color-ink-faint)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs mb-4" style={{ color: '#a55432' }}>{error}</p>}

      {/* Card list */}
      {cards === null ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>Loading…</p>
      ) : cards.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((card) => (
            <li key={card.id} className="card overflow-hidden group">
              <div className="p-5">
                {/* Front (Arabic sentence) */}
                <p
                  className="arabic mb-3"
                  dir="rtl"
                  style={{
                    fontSize: '1.25rem',
                    lineHeight: 1.9,
                    color: card.suspended ? 'var(--color-ink-faint)' : 'var(--color-ink)',
                  }}
                >
                  {card.front}
                </p>

                {/* Back (translation) */}
                <p
                  className="text-sm mb-3"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  {card.back.split('\n\n')[0]}
                </p>

                {/* Meta row */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 text-[11px]"
                    style={{ color: 'var(--color-ink-faint)' }}
                  >
                    <CardBadge card={card} />
                    {card.text_title && (
                      <span className="truncate max-w-[160px]">from {card.text_title}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onToggleSuspend(card)}
                      className="p-1.5 rounded-sm hover:bg-[var(--color-surface-sunk)]"
                      title={card.suspended ? 'Resume' : 'Pause'}
                    >
                      {card.suspended ? (
                        <PlayCircle size={14} strokeWidth={1.5} color="var(--color-accent)" />
                      ) : (
                        <PauseCircle size={14} strokeWidth={1.5} color="var(--color-ink-faint)" />
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(card.id)}
                      className="p-1.5 rounded-sm hover:bg-[var(--color-surface-sunk)]"
                      title="Delete"
                    >
                      <Trash2 size={14} strokeWidth={1.5} color="var(--color-ink-faint)" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className="card px-3 py-3 text-center"
      style={accent && value > 0 ? { borderColor: 'var(--color-accent-soft)' } : undefined}
    >
      <div
        className="text-xl"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          color: accent && value > 0 ? 'var(--color-accent)' : 'var(--color-ink)',
        }}
      >
        {value}
      </div>
      <div
        className="text-[10px] uppercase tracking-[0.12em] mt-0.5"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {label}
      </div>
    </div>
  )
}

function CardBadge({ card }: { card: CardWithText }) {
  let label: string
  let color: string

  if (card.suspended) {
    label = 'Paused'
    color = 'var(--color-ink-faint)'
  } else if (!card.last_reviewed_at) {
    label = 'New'
    color = 'var(--color-accent)'
  } else if (card.interval_days >= 21) {
    label = 'Mastered'
    color = '#5a7a3f'
  } else {
    label = `Learning · ${card.interval_days}d`
    color = 'var(--color-accent-deep)'
  }

  return (
    <span
      className="px-1.5 py-0.5 rounded-sm uppercase tracking-[0.1em]"
      style={{ background: 'var(--color-surface-sunk)', color }}
    >
      {label}
    </span>
  )
}

function EmptyState({ filter }: { filter: CardFilter }) {
  const messages: Record<CardFilter, string> = {
    all: 'No sentences mined yet. Open a text, tap a word, and choose "Mine sentence".',
    due: 'Nothing due right now. Come back later.',
    new: 'No new cards. Mine some sentences from your library.',
    learning: 'No cards in learning yet.',
    mastered: 'No mastered cards yet — keep reviewing.',
    suspended: 'No paused cards.',
  }
  return (
    <div className="card p-10 text-center">
      <Layers size={26} strokeWidth={1.2} color="var(--color-ink-faint)" className="mx-auto mb-4" />
      <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-ink-soft)' }}>
        {messages[filter]}
      </p>
      <div className="mt-6">
        <Link to="/library">
          <span
            className="text-xs uppercase tracking-[0.16em]"
            style={{ color: 'var(--color-accent)' }}
          >
            Go to library →
          </span>
        </Link>
      </div>
    </div>
  )
}
