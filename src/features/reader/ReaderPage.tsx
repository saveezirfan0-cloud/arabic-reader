import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  getText,
  loadVocabularyMap,
  getOrCreateVocab,
} from '@/lib/queries'
import { tokenize, findSentence, type Token } from '@/lib/arabic'
import type { Text, Vocabulary, WordState } from '@/types/database'
import { WordModal } from './WordModal'

type VocabMap = Map<string, Vocabulary>

export function ReaderPage() {
  const { id } = useParams<{ id: string }>()
  const [text, setText] = useState<Text | null>(null)
  const [vocab, setVocab] = useState<VocabMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [selectedVocab, setSelectedVocab] = useState<Vocabulary | null>(null)

  // Load text + vocab map
  useEffect(() => {
    if (!id) return
    Promise.all([getText(id), loadVocabularyMap()])
      .then(([t, v]) => {
        setText(t)
        setVocab(v)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // Tokenize once when text loads
  const tokens = useMemo(() => (text ? tokenize(text.content) : []), [text])

  const onWordTap = async (tok: Token) => {
    if (!tok.lemma) return
    setSelectedToken(tok)

    // Get or create vocab entry (bumps encounter count)
    try {
      const v = await getOrCreateVocab({ surface: tok.text })
      setSelectedVocab(v)
      // Update local vocab map
      setVocab((prev) => {
        const next = new Map(prev)
        next.set(v.lemma, v)
        return next
      })
    } catch (err) {
      console.error('Failed to get/create vocab', err)
    }
  }

  const onCloseModal = () => {
    setSelectedToken(null)
    setSelectedVocab(null)
  }

  const onVocabUpdated = (updated: Vocabulary) => {
    setSelectedVocab(updated)
    setVocab((prev) => {
      const next = new Map(prev)
      next.set(updated.lemma, updated)
      return next
    })
  }

  if (loading) {
    return <CenterStatus>Loading…</CenterStatus>
  }
  if (error) {
    return <CenterStatus>{error}</CenterStatus>
  }
  if (!text) {
    return <CenterStatus>Text not found</CenterStatus>
  }

  const sentence = selectedToken && text
    ? findSentence(text.content, selectedToken.start)
    : ''

  return (
    <>
      <div className="max-w-3xl w-full mx-auto px-6 md:px-10 py-8 md:py-12">
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] mb-8 hover:text-[var(--color-ink)] transition-colors"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          Library
        </Link>

        <header className="mb-10 fade-up">
          <p
            className="text-xs uppercase tracking-[0.22em] mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            Reading · {text.word_count} words
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
            {text.title}
          </h1>
        </header>

        <article className="arabic fade-up fade-up-delay-1" style={{ fontSize: '1.5rem', lineHeight: 2.2 }}>
          {tokens.map((tok, i) => {
            if (tok.kind === 'space') {
              return <span key={i}>{tok.text}</span>
            }
            const v = vocab.get(tok.lemma!)
            const state: WordState = v?.state ?? 'unknown'
            const isMined = v?.state === 'learning' && !!v?.definition
            const cls =
              state === 'known'
                ? 'w-known'
                : isMined
                ? 'w-mined'
                : state === 'learning'
                ? 'w-learning'
                : state === 'ignored'
                ? 'w-known'
                : 'w-unknown'
            return (
              <span
                key={i}
                className={cls}
                onClick={() => onWordTap(tok)}
              >
                {tok.text}
              </span>
            )
          })}
        </article>

        <div
          className="mt-16 flex items-center gap-6 text-xs"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          <LegendDot className="w-unknown" label="Unknown" />
          <LegendDot className="w-learning" label="Learning" />
          <LegendDot className="w-mined" label="Mined" />
          <span style={{ color: 'var(--color-ink-ghost)' }}>Known</span>
        </div>
      </div>

      <WordModal
        open={!!selectedToken}
        onClose={onCloseModal}
        token={selectedToken}
        sentence={sentence}
        vocab={selectedVocab}
        textId={text.id}
        onVocabUpdated={onVocabUpdated}
      />
    </>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${className} inline-block w-6 h-3`} />
      <span>{label}</span>
    </span>
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
