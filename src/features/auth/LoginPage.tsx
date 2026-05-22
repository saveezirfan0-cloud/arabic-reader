import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from './useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'

export function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (loading) return <CenterLoader />
  if (user) return <Navigate to="/library" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setInfo(
          'Account created. Check your email if confirmation is required, otherwise sign in below.',
        )
        setMode('signin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm fade-up">
        <div className="text-center mb-10">
          <h1
            className="arabic-display text-5xl mb-3"
            style={{ color: 'var(--color-ink)' }}
          >
            اقرأ
          </h1>
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            Arabic Reader
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div
            className="mb-6 p-4 text-sm rounded-sm border"
            style={{
              background: 'rgba(180, 130, 70, 0.08)',
              borderColor: 'var(--color-accent-soft)',
              color: 'var(--color-accent-deep)',
            }}
          >
            Supabase isn't configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>.
          </div>
        )}

        <form onSubmit={onSubmit} className="card p-6 flex flex-col gap-4">
          <h2
            className="text-lg"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--color-ink)',
            }}
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>

          <label className="flex flex-col gap-1.5">
            <span
              className="text-xs uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 text-sm rounded-sm border outline-none transition"
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
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 text-sm rounded-sm border outline-none transition"
              style={{
                background: 'var(--color-paper)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
              }}
            />
          </label>

          {error && (
            <p className="text-xs" style={{ color: '#a55432' }}>
              {error}
            </p>
          )}
          {info && (
            <p className="text-xs" style={{ color: 'var(--color-accent-deep)' }}>
              {info}
            </p>
          )}

          <Button type="submit" disabled={busy} size="md" className="mt-2">
            {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setInfo(null)
            }}
            className="text-xs text-center mt-1 underline-offset-4 hover:underline"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {mode === 'signin'
              ? 'No account yet? Sign up'
              : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}

function CenterLoader() {
  return (
    <main className="min-h-dvh flex items-center justify-center">
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: 'var(--color-ink-faint)' }}
      />
    </main>
  )
}
