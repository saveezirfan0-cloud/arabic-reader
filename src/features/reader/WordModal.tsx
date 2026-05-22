import { useEffect, useState } from 'react'
import { Sparkles, Check, BookmarkPlus, EyeOff } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  analyzeWord,
  enrichVocab,
  setWordState,
  createSentenceCard,
  type WordAnalysis,
} from '@/lib/queries'
import type { Vocabulary } from '@/types/database'
import type { Token } from '@/lib/arabic'

interface Props {
  open: boolean
  onClose: () => void
  token: Token | null
  sentence: string
  vocab: Vocabulary | null
  textId: string
  onVocabUpdated: (v: Vocabulary) => void
}

export function WordModal({
  open,
  onClose,
  token,
  sentence,
  vocab,
  textId,
  onVocabUpdated,
}: Props) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<WordAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mined, setMined] = useState(false)

  // When a new word is selected, reset + auto-analyze if no definition yet
  useEffect(() => {
    if (!open || !token || !vocab) return
    setError(null)
    setMined(false)

    // If vocab already has a definition, use it; don't re-call the LLM
    if (vocab.definition && vocab.translation) {
      setAnalysis({
        lemma: vocab.lemma,
        root: vocab.root,
        definition: vocab.definition,
        translation: vocab.translation,
        pos: vocab.pos ?? '',
        morphology: (vocab.morphology as Record<string, unknown>) ?? {},
        sentence_translation: '',
      })
      return
    }

    // Otherwise, fetch from LLM
    setAnalysis(null)
    setAnalyzing(true)
    analyzeWord(token.text, sentence)
      .then(async (a) => {
        setAnalysis(a)
        // Save enrichment to DB
        const updated = await enrichVocab(vocab.id, {
          root: a.root,
          definition: a.definition,
          translation: a.translation,
          pos: a.pos,
          morphology: a.morphology as never,
        })
        onVocabUpdated(updated)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Analysis failed'))
      .finally(() => setAnalyzing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token?.start])

  const onMarkKnown = async () => {
    if (!vocab) return
    setBusy(true)
    try {
      const updated = await setWordState(vocab.id, 'known')
      onVocabUpdated(updated)
      onClose()
    } finally { setBusy(false) }
  }

  const onMarkLearning = async () => {
    if (!vocab) return
    setBusy(true)
    try {
      const updated = await setWordState(vocab.id, 'learning')
      onVocabUpdated(updated)
      onClose()
    } finally { setBusy(false) }
  }

  const onIgnore = async () => {
    if (!vocab) return
    setBusy(true)
    try {
      const updated = await setWordState(vocab.id, 'ignored')
      onVocabUpdated(updated)
      onClose()
    } finally { setBusy(false) }
  }

  const onMine = async () => {
    if (!vocab || !analysis || !token) return
    setBusy(true)
    try {
      await createSentenceCard({
        vocabulary_id: vocab.id,
        text_id: textId,
        sentence,
        word: token.text,
        translation: analysis.translation,
        sentence_translation: analysis.sentence_translation || '',
      })
      // Mark vocab as learning
      const updated = await setWordState(vocab.id, 'learning')
      onVocabUpdated(updated)
      setMined(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mining failed')
    } finally { setBusy(false) }
  }

  if (!token) return null

  return (
    <Modal open={open} onClose={onClose} maxWidth="540px">
      {/* Headword */}
      <div className="text-center mb-5">
        <p
          className="arabic mb-1"
          style={{
            fontSize: '2.5rem',
            lineHeight: 1.2,
            color: 'var(--color-ink)',
          }}
        >
          {token.text}
        </p>
        {analysis?.root && (
          <p
            className="text-xs uppercase tracking-[0.22em]"
            style={{ color: 'var(--color-accent)' }}
          >
            Root <span className="arabic-display" style={{ fontSize: '1.1rem', letterSpacing: '0.3em' }}>{analysis.root}</span>
          </p>
        )}
      </div>

      <div className="rule mb-5" />

      {/* Body */}
      {analyzing && (
        <div className="flex items-center gap-2 py-6 justify-center" style={{ color: 'var(--color-ink-faint)' }}>
          <Sparkles size={14} strokeWidth={1.5} className="animate-pulse" />
          <span className="text-xs uppercase tracking-[0.16em]">Analyzing…</span>
        </div>
      )}

      {error && !analyzing && (
        <div
          className="text-sm py-5 px-4 rounded-sm"
          style={{ background: 'rgba(180, 130, 70, 0.08)', color: 'var(--color-accent-deep)' }}
        >
          <p className="mb-1" style={{ fontWeight: 600 }}>Couldn't load the definition.</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
            The word-analysis function may not be deployed yet. You can still
            mark this word as Learning, Known, or Ignore below.
          </p>
        </div>
      )}

      {analysis && !analyzing && (
        <div className="flex flex-col gap-4">
          <Row label="Translation">
            <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
              {analysis.translation}
            </span>
            {analysis.pos && (
              <span
                className="ml-2 text-xs uppercase tracking-[0.14em]"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                {analysis.pos}
              </span>
            )}
          </Row>

          <Row label="Definition">
            <span style={{ color: 'var(--color-ink-soft)' }}>{analysis.definition}</span>
          </Row>

          {sentence && analysis.sentence_translation && (
            <Row label="Sentence">
              <p
                className="arabic mb-2"
                style={{ fontSize: '1.05rem', lineHeight: 1.9, color: 'var(--color-ink)' }}
              >
                {sentence}
              </p>
              <p
                className="text-sm italic"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                {analysis.sentence_translation}
              </p>
            </Row>
          )}

          {Object.keys(analysis.morphology).length > 0 && (
            <Row label="Morphology">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                {Object.entries(analysis.morphology)
                  .filter(([, v]) => v != null && v !== '')
                  .map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: 'var(--color-ink-faint)' }}>{k}: </span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
              </div>
            </Row>
          )}

          {vocab && vocab.encounter_count > 1 && (
            <p
              className="text-xs"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              Seen {vocab.encounter_count} times
            </p>
          )}
        </div>
      )}

      {mined && (
        <div
          className="mt-4 p-3 rounded-sm text-xs flex items-center gap-2"
          style={{
            background: 'rgba(110, 80, 40, 0.08)',
            color: 'var(--color-accent-deep)',
          }}
        >
          <Check size={12} strokeWidth={2} />
          Sentence card created. Review later from the Review tab.
        </div>
      )}

      {/* Actions — Known/Learning/Ignore always available (no LLM needed).
          Mine requires analysis since the card back uses the translation. */}
      <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-[var(--color-border)]">
        <Button onClick={onMine} disabled={busy || mined || !analysis || analyzing} size="sm">
          <BookmarkPlus size={13} strokeWidth={1.5} />
          {mined ? 'Mined' : analyzing ? 'Analyzing…' : 'Mine sentence'}
        </Button>
        <Button onClick={onMarkLearning} variant="ghost" disabled={busy} size="sm">
          <BookmarkPlus size={13} strokeWidth={1.5} />
          Learning
        </Button>
        <Button onClick={onMarkKnown} variant="ghost" disabled={busy} size="sm">
          <Check size={13} strokeWidth={1.5} />
          I know this
        </Button>
        <Button onClick={onIgnore} variant="subtle" disabled={busy} size="sm">
          <EyeOff size={13} strokeWidth={1.5} />
          Ignore
        </Button>
      </div>
    </Modal>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.2em] mb-1.5"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {label}
      </p>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
