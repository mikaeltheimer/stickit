'use client'

import { useState } from 'react'

interface Step2DetourProps {
  file: File
  previewUrl: string
  onNext: (finalUrl: string, finalFile: File) => void
  onBack: () => void
}

type DetourState = 'idle' | 'processing' | 'done' | 'error'

export default function Step2Detour({ file, previewUrl, onNext, onBack }: Step2DetourProps) {
  const [state, setState] = useState<DetourState>('idle')
  const [detoured, setDetoured] = useState<string | null>(null)
  const [useDetoured, setUseDetoured] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isProcessing = state === 'processing'

  const runDetour = async () => {
    setState('processing')
    setErrorMsg(null)
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = await removeBackground(file)
      const url = URL.createObjectURL(blob)

      // Convert blob to File for upload later
      const detFile = new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' })
      setDetoured(url)
      setUseDetoured(true)
      setState('done')

      // Store detoured file reference
      ;(window as any).__detourFile = detFile
    } catch (e) {
      console.error(e)
      setErrorMsg('Background removal failed. Try with a simpler image.')
      setState('error')
    }
  }

  const handleNext = () => {
    if (useDetoured && detoured) {
      const detFile = (window as any).__detourFile as File
      onNext(detoured, detFile)
    } else {
      onNext(previewUrl, file)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Preview area */}
      {state !== 'done' ? (
        // Single preview before detour
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
        }}>
          <img
            src={previewUrl}
            alt="Your sticker"
            style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      ) : (
        // Before / after comparison
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Original', src: previewUrl, active: !useDetoured },
            { label: 'Background removed', src: detoured!, active: useDetoured },
          ].map(({ label, src, active }) => (
            <div
              key={label}
              onClick={() => setUseDetoured(label === 'Background removed')}
              style={{
                background: active ? 'rgba(0,255,156,0.06)' : 'rgba(255,255,255,0.02)',
                border: `2px solid ${active ? 'rgba(0,255,156,0.4)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {/* Checkerboard bg for transparency */}
              <div style={{
                backgroundImage: label === 'Background removed'
                  ? 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)'
                  : 'none',
                backgroundSize: '12px 12px',
                borderRadius: 8,
                padding: 8,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 140,
              }}>
                <img
                  src={src}
                  alt={label}
                  style={{ maxHeight: 130, maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: `2px solid ${active ? '#00FF9C' : 'rgba(255,255,255,0.2)'}`,
                  background: active ? '#00FF9C' : 'transparent',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }} />
                <span style={{
                  fontSize: 11, color: active ? '#00FF9C' : '#7A756E',
                  letterSpacing: '0.04em',
                }}>
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div style={{
          fontSize: 12, color: '#FF2D78',
          background: 'rgba(255,45,120,0.08)',
          border: '1px solid rgba(255,45,120,0.2)',
          borderRadius: 8, padding: '10px 14px',
        }}>
          {errorMsg}
        </div>
      )}

      {/* Processing indicator */}
      {state === 'processing' && (
        <div style={{
          fontSize: 12, color: '#7A756E', textAlign: 'center',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          Removing background…
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {state === 'idle' || state === 'error' ? (
          <ActionButton
            onClick={runDetour}
            variant="secondary"
            disabled={isProcessing}
          >
            ✂️ Remove background
          </ActionButton>
        ) : null}

        <div style={{ display: 'flex', gap: 10 }}>
          <ActionButton onClick={onBack} variant="ghost">
            ← Back
          </ActionButton>
          <ActionButton
            onClick={handleNext}
            variant="primary"
            disabled={isProcessing}
            style={{ flex: 1 }}
          >
            {state === 'done' && useDetoured ? 'Use detoured image →' : 'Skip, use original →'}
          </ActionButton>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Shared button ─────────────────────────────────────────────────────────────
function ActionButton({
  onClick, children, variant, disabled, style
}: {
  onClick: () => void
  children: React.ReactNode
  variant: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    border: 'none', borderRadius: 100,
    padding: '10px 20px', fontSize: 13,
    fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', letterSpacing: '0.04em',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.15s',
    ...style,
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: '#E8FF47', color: '#0F0E0D',
    },
    secondary: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#F0EDE8',
    },
    ghost: {
      background: 'none',
      color: '#7A756E',
    },
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={e => {
        if (disabled) return
        if (variant === 'primary') e.currentTarget.style.background = '#f0ff6a'
        if (variant === 'secondary') e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
        if (variant === 'ghost') e.currentTarget.style.color = '#F0EDE8'
      }}
      onMouseLeave={e => {
        if (disabled) return
        if (variant === 'primary') e.currentTarget.style.background = '#E8FF47'
        if (variant === 'secondary') e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        if (variant === 'ghost') e.currentTarget.style.color = '#7A756E'
      }}
    >
      {children}
    </button>
  )
}