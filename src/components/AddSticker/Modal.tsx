'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  onClose?: () => void
  children: React.ReactNode
  title?: string
  step?: number
  totalSteps?: number
}

export default function Modal({ onClose, children, title, step, totalSteps }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const stop = (e: WheelEvent) => e.stopPropagation()
    el.addEventListener('wheel', stop, { passive: false })
    return () => el.removeEventListener('wheel', stop)
  }, [])
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      ref={overlayRef}
      onWheel={e => e.stopPropagation()}  // ← bloque le canvas
      onClick={e => { if (e.target === e.currentTarget && onClose) onClose() }}
    >
      <div style={{
        background: '#161513',
        border: '1px solid rgba(255,45,120,0.25)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 520,
        height: 'min(780px, 92vh)',  // ← hauteur fixe, pas maxHeight
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 60px rgba(255,45,120,0.12)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            {title && (
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 22, color: '#E8FF47', letterSpacing: '0.06em',
                textShadow: '0 0 16px rgba(232,255,71,0.3)',
              }}>
                {title}
              </div>
            )}
            {step && totalSteps && (
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2,
              }}>
                Step {step} of {totalSteps}
              </div>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: '#1E1C1A', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '50%', width: 30, height: 30,
                color: '#7A756E', fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#F0EDE8'}
              onMouseLeave={e => e.currentTarget.style.color = '#7A756E'}
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress bar */}
        {step && totalSteps && (
          <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
            <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${(step / totalSteps) * 100}%`,
                background: '#FF2D78',
                borderRadius: 2,
                transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: '0 0 8px rgba(255,45,120,0.5)',
              }} />
            </div>
          </div>
        )}

        {/* Content — c'est ici que le scroll vit */}
        <div style={{
          padding: 24,
          flex: 1,
          minHeight: 0,
          overflowY: 'scroll',   // ← scroll forcé, pas auto
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}