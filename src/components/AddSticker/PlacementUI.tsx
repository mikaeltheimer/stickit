'use client'

interface PlacementUIProps {
  mode: 'suggestions' | 'manual'
  activeIdx: number
  totalCandidates: number
  canConfirm: boolean
  manualValid: boolean | null
  onModeChange: (m: 'suggestions' | 'manual') => void
  onPrev: () => void
  onNext: () => void
  onConfirm: () => void
  onCancel: () => void
}

export default function PlacementUI({
  mode, activeIdx, totalCandidates, canConfirm, manualValid,
  onModeChange, onPrev, onNext, onConfirm, onCancel,
}: PlacementUIProps) {
  return (
    <>
      {/* Top banner */}
      <div style={{
        position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 300,
        background: 'rgba(15,14,13,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 100,
        padding: '8px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 100, padding: 3,
        }}>
          {(['suggestions', 'manual'] as const).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              style={{
                borderRadius: 100, border: 'none',
                padding: '5px 14px', fontSize: 11,
                fontFamily: 'inherit', letterSpacing: '0.04em',
                cursor: 'pointer',
                background: mode === m ? 'rgba(232,255,71,0.15)' : 'transparent',
                color: mode === m ? '#E8FF47' : '#7A756E',
                transition: 'all 0.15s',
              }}
            >
              {m === 'suggestions' ? '✦ Suggestions' : '✎ Manual'}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />

        {/* Status */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
          {mode === 'suggestions' && totalCandidates > 0 && (
            `Position ${activeIdx + 1} of ${totalCandidates}`
          )}
          {mode === 'suggestions' && totalCandidates === 0 && (
            <span style={{ color: '#FF2D78' }}>No positions found</span>
          )}
          {mode === 'manual' && manualValid === null && 'Click to place'}
          {mode === 'manual' && manualValid === true && (
            <span style={{ color: '#00FF9C' }}>Valid position ✓</span>
          )}
          {mode === 'manual' && manualValid === false && (
            <span style={{ color: '#FF2D78' }}>Invalid position</span>
          )}
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 100, padding: '4px 12px',
            fontSize: 11, color: '#7A756E', cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#F0EDE8'}
          onMouseLeave={e => e.currentTarget.style.color = '#7A756E'}
        >
          Cancel
        </button>
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 300,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Suggestion nav */}
        {mode === 'suggestions' && (
          <>
            <NavBtn onClick={onPrev} disabled={activeIdx === 0}>←</NavBtn>
            <NavBtn onClick={onNext} disabled={activeIdx >= totalCandidates - 1}>→</NavBtn>
          </>
        )}

        {/* Confirm */}
        <button
          onClick={canConfirm ? onConfirm : undefined}
          style={{
            background: canConfirm ? '#E8FF47' : 'rgba(232,255,71,0.2)',
            color: '#0F0E0D',
            border: 'none', borderRadius: 100,
            padding: '12px 28px', fontSize: 13,
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            letterSpacing: '0.1em',
            cursor: canConfirm ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: canConfirm ? '0 0 20px rgba(232,255,71,0.3)' : 'none',
          }}
          onMouseEnter={e => { if (canConfirm) e.currentTarget.style.background = '#f0ff6a' }}
          onMouseLeave={e => { if (canConfirm) e.currentTarget.style.background = '#E8FF47' }}
        >
          Confirm placement →
        </button>
      </div>

      {/* Keyboard hint */}
      {mode === 'suggestions' && totalCandidates > 0 && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300,
          fontSize: 10, color: 'rgba(255,255,255,0.15)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          ← → arrow keys to navigate
        </div>
      )}
    </>
  )
}

function NavBtn({ onClick, disabled, children }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        background: 'rgba(15,14,13,0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 100, width: 42, height: 42,
        color: disabled ? 'rgba(255,255,255,0.15)' : '#F0EDE8',
        fontSize: 18, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
    >
      {children}
    </button>
  )
}