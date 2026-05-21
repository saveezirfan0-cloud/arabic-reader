import { useEffect, useState } from 'react'
import { BookOpen, Headphones, Sparkles, ArrowLeftRight } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type ConnState = 'checking' | 'connected' | 'unconfigured' | 'error'

const SAMPLE_SENTENCES = [
  { ar: 'في الحقيقة، أحب أن أقرأ الكتب القديمة.', en: 'In truth, I love to read old books.' },
  { ar: 'الوقت كالسيف، إن لم تقطعه قطعك.', en: 'Time is like a sword — if you do not cut it, it cuts you.' },
  { ar: 'من جدّ وجد، ومن زرع حصد.', en: 'Who strives, finds; who sows, reaps.' },
]

export default function App() {
  const [conn, setConn] = useState<ConnState>('checking')
  const [sampleIdx, setSampleIdx] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConn('unconfigured')
      return
    }
    // A lightweight call that works whether or not we have tables yet.
    supabase.auth.getSession().then(({ error }) => {
      setConn(error ? 'error' : 'connected')
    })
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setSampleIdx((i) => (i + 1) % SAMPLE_SENTENCES.length)
    }, 5500)
    return () => clearInterval(id)
  }, [])

  const sample = SAMPLE_SENTENCES[sampleIdx]!

  return (
    <main className="min-h-dvh w-full flex flex-col">
      {/* Top bar */}
      <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-baseline gap-3">
          <span
            className="arabic-display text-2xl"
            style={{ color: 'var(--color-ink)' }}
            aria-label="iqra"
          >
            اقرأ
          </span>
          <span
            className="text-xs uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            Arabic · v0.1
          </span>
        </div>
        <ConnectionBadge state={conn} />
      </header>

      {/* Hero */}
      <section className="flex-1 px-6 md:px-10 py-16 md:py-24 max-w-3xl mx-auto w-full">
        <p
          className="fade-up text-xs uppercase tracking-[0.22em] mb-6"
          style={{ color: 'var(--color-accent)' }}
        >
          Step 1 · Foundation laid
        </p>

        <h1
          className="fade-up fade-up-delay-1 text-5xl md:text-6xl leading-[1.05] mb-6"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
          }}
        >
          A quiet place to <em style={{ fontStyle: 'italic' }}>read</em> Arabic.
        </h1>

        <p
          className="fade-up fade-up-delay-2 text-lg md:text-xl leading-relaxed max-w-xl mb-10"
          style={{ color: 'var(--color-ink-soft)', fontFamily: 'var(--font-display)' }}
        >
          Comprehensible input, sentence mining, and a smart review loop —
          designed so meaningful exposure does the heavy lifting.
        </p>

        {/* Rotating sample */}
        <div className="fade-up fade-up-delay-3 card p-7 md:p-9 mb-10">
          <div
            className="text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            <ArrowLeftRight size={11} strokeWidth={1.5} />
            <span>Sample</span>
          </div>
          <p
            key={sample.ar}
            className="arabic fade-up mb-4"
            style={{ color: 'var(--color-ink)' }}
          >
            <span className="w-known">{sample.ar.split(' ')[0]}</span>{' '}
            <span className="w-known">{sample.ar.split(' ').slice(1, 3).join(' ')}</span>{' '}
            <span className="w-unknown">{sample.ar.split(' ').slice(3, 5).join(' ')}</span>{' '}
            <span className="w-learning">{sample.ar.split(' ').slice(5).join(' ')}</span>
          </p>
          <div className="rule mb-4" />
          <p
            key={sample.en}
            className="fade-up text-sm md:text-base italic"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {sample.en}
          </p>
        </div>

        {/* Three pillars */}
        <div className="fade-up fade-up-delay-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Pillar
            icon={<BookOpen size={18} strokeWidth={1.5} />}
            title="Extensive reading"
            body="Tap any word for root, morphology, and audio — without breaking flow."
          />
          <Pillar
            icon={<Sparkles size={18} strokeWidth={1.5} />}
            title="Sentence mining"
            body="One-tap card creation. Chunks and collocations, not isolated words."
          />
          <Pillar
            icon={<Headphones size={18} strokeWidth={1.5} />}
            title="Listening sync"
            body="Karaoke-style highlighting, sentence loop, shadowing mode."
          />
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 md:px-10 py-6 border-t border-[var(--color-border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        <p className="text-xs uppercase tracking-[0.18em]">
          Built for meaningful exposure
        </p>
        <p className="text-xs">
          <span className="arabic" style={{ fontSize: '0.95rem' }}>
            وَقُل رَبِّ زِدْنِي عِلْمًا
          </span>
        </p>
      </footer>
    </main>
  )
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="w-9 h-9 rounded-sm flex items-center justify-center"
        style={{
          background: 'var(--color-surface-sunk)',
          color: 'var(--color-accent)',
          border: '1px solid var(--color-border)',
        }}
      >
        {icon}
      </div>
      <h3
        className="text-base"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          letterSpacing: '-0.005em',
          color: 'var(--color-ink)',
        }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        {body}
      </p>
    </div>
  )
}

function ConnectionBadge({ state }: { state: ConnState }) {
  const config = {
    checking: { dot: 'var(--color-ink-ghost)', label: 'Checking…', pulse: true },
    connected: { dot: '#5a7a3f', label: 'Supabase connected', pulse: false },
    unconfigured: { dot: 'var(--color-accent-soft)', label: 'Configure .env.local', pulse: false },
    error: { dot: '#a55432', label: 'Connection error', pulse: false },
  }[state]

  return (
    <div
      className="flex items-center gap-2.5 text-xs"
      style={{ color: 'var(--color-ink-soft)' }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
        style={{ background: config.dot }}
      />
      <span className="uppercase tracking-[0.14em]">{config.label}</span>
    </div>
  )
}
