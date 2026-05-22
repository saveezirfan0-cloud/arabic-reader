import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  maxWidth?: string
}

export function Modal({ open, onClose, children, title, maxWidth = '520px' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 20, 0.40)' }}
      onClick={onClose}
    >
      <div
        className="card w-full fade-up"
        style={{ maxWidth, maxHeight: '85dvh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2
              className="text-base"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                color: 'var(--color-ink)',
                letterSpacing: '-0.005em',
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-sm hover:bg-[var(--color-surface-sunk)]"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.5} color="var(--color-ink-soft)" />
            </button>
          </div>
        )}
        <div className={title ? 'px-6 pb-6' : 'p-6'}>{children}</div>
      </div>
    </div>
  )
}
