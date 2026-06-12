'use client'

interface HUDProps {
  scale: number
  panelOpen: boolean
  stickersCount: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

export default function HUD({ scale, panelOpen, stickersCount, onZoomIn, onZoomOut, onFit }: HUDProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: panelOpen ? 'calc(50% - 170px)' : '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      transition: 'left 0.38s cubic-bezier(0.22,1,0.36,1)',
    }}>
      {/* Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: 'rgba(15,14,13,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,45,120,0.35)',
        borderRadius: 100,
        padding: '5px 6px',
        boxShadow: '0 0 18px rgba(255,45,120,0.12)',
      }}>
        <HUDButton onClick={onZoomOut}>−</HUDButton>

        <span style={{
          fontSize: 11,
          color: 'rgba(255,45,120,0.55)',
          padding: '0 8px',
          letterSpacing: '0.08em',
          fontWeight: 500,
          minWidth: 44,
          textAlign: 'center',
        }}>
          {Math.round(scale * 100)}%
        </span>

        <HUDButton onClick={onZoomIn}>+</HUDButton>

        <div style={{
          width: 1, height: 16,
          background: 'rgba(255,45,120,0.25)',
          margin: '0 3px',
        }} />

        <HUDButton onClick={onFit}>⊡</HUDButton>
      </div>

      {/* Compteur sous le pill */}
      <div style={{
        marginTop: 10,
        textAlign: 'center',
        fontSize: 10,
        color: 'rgba(0,207,255,0.4)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        textShadow: '0 0 12px rgba(0,207,255,0.25)',
        pointerEvents: 'none',
      }}>
        {stickersCount} sticker{stickersCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

function HUDButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.45)',
        borderRadius: 100,
        padding: '6px 14px',
        fontSize: 16,
        cursor: 'pointer',
        fontFamily: 'inherit',
        lineHeight: 1,
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(0,255,156,0.12)'
        e.currentTarget.style.color = '#00FF9C'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none'
        e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
      }}
    >
      {children}
    </button>
  )
}