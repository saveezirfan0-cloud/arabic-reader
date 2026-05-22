import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 transition-all duration-150 ' +
    'font-medium tracking-tight rounded-sm focus:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed'

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  }

  const variants = {
    primary:
      'bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-accent-deep)] active:scale-[0.98]',
    ghost:
      'bg-transparent text-[var(--color-ink)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-sunk)]',
    subtle:
      'bg-[var(--color-surface-sunk)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-edge)]',
    danger:
      'bg-transparent text-[#a55432] border border-[#a5543233] hover:bg-[#a5543210]',
  }

  return (
    <button className={clsx(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  )
}
