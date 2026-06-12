'use client'

interface AddButtonProps {
  onClick: () => void
}

export default function AddButton({ onClick }: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 28,
        left: 28,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(15,14,13,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(232,255,71,0.35)',
        borderRadius: 100,
        padding: '10px 18px',
        color: '#E8FF47',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.06em',
        cursor: 'pointer',
        fontFamily: 'inherit',
        boxShadow: '0 0 18px rgba(232,255,71,0.1)',
        transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(232,255,71,0.12)'
        e.currentTarget.style.boxShadow = '0 0 28px rgba(232,255,71,0.25)'
        e.currentTarget.style.borderColor = 'rgba(232,255,71,0.7)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(15,14,13,0.75)'
        e.currentTarget.style.boxShadow = '0 0 18px rgba(232,255,71,0.1)'
        e.currentTarget.style.borderColor = 'rgba(232,255,71,0.35)'
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
      Add a sticker
    </button>
  )
}