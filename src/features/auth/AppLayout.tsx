import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { countDueCards } from '@/lib/queries'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const [dueCount, setDueCount] = useState<number | null>(null)
  const location = useLocation()

  useEffect(() => {
    countDueCards().then(setDueCount).catch(() => setDueCount(0))
  }, [location.pathname])

  const navItem = (
    to: string,
    label: string,
    badge?: number | null,
  ) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-xs uppercase tracking-[0.16em] transition-colors flex items-center gap-2 ${
          isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)]'
        }`
      }
    >
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-sm"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-paper)',
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-[var(--color-border)]">
        <Link to="/library" className="flex items-baseline gap-3 group">
          <span
            className="arabic-display text-2xl"
            style={{ color: 'var(--color-ink)' }}
          >
            اقرأ
          </span>
          <span
            className="text-xs uppercase tracking-[0.18em] hidden sm:inline"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            Arabic
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {navItem('/library', 'Library')}
          {navItem('/review', 'Review', dueCount)}
        </nav>

        <div className="flex items-center gap-4">
          <span
            className="text-xs hidden md:inline"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            {user?.email}
          </span>
          <button
            onClick={signOut}
            className="p-1.5 rounded-sm hover:bg-[var(--color-surface-sunk)]"
            aria-label="Sign out"
          >
            <LogOut size={14} strokeWidth={1.5} color="var(--color-ink-soft)" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
