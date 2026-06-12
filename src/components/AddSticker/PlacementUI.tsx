'use client'

interface PlacementUIProps {
  hasPosition: boolean
  canConfirm: boolean
  rotation: number
  scale: number
  positionIndex: number
  totalPositions: number
  onRotationChange: (r: number) => void
  onScaleChange: (s: number) => void
  onPositionChange: (i: number) => void
  onConfirm: () => void
  onCancel: () => void
  isMobile: boolean
}

export default function PlacementUI({
  hasPosition, canConfirm, rotation, scale,
  positionIndex, totalPositions,
  onRotationChange, onScaleChange, onPositionChange,
  onConfirm, onCancel, isMobile,
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
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {hasPosition
            ? '✓ Position ready — adjust and confirm'
            : 'Computing placement zone…'}
        </span>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />

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
        background: 'rgba(15,14,13,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minWidth: 340,
      }}>

        {/* Position along perimeter */}
        <SliderRow
          label="Position"
          value={positionIndex}
          min={0}
          max={totalPositions - 1}
          step={1}
          displayValue={`${Math.round((positionIndex / totalPositions) * 100)}%`}
          accentColor="#00CFFF"
          onChange={onPositionChange}
          hint={isMobile ? 'drag to move along the wall' : 'drag to move along the wall'}
        />

        {/* Rotation */}
        <SliderRow
          label="Rotation"
          value={rotation}
          min={-45}
          max={45}
          step={1}
          displayValue={`${rotation > 0 ? '+' : ''}${rotation}°`}
          accentColor="#E8FF47"
          onChange={onRotationChange}
          hint={isMobile ? 'or twist with two fingers' : 'or use scroll wheel'}
          centerTick
        />

        {/* Scale */}
        <SliderRow
          label="Size"
          value={Math.round(scale * 100)}
          min={95}
          max={115}
          step={1}
          displayValue={`${Math.round(scale * 100)}%`}
          accentColor="#00FF9C"
          onChange={v => onScaleChange(v / 100)}
          hint={isMobile ? 'or pinch with two fingers' : undefined}
        />

        {/* Confirm */}
        <button
          onClick={canConfirm ? onConfirm : undefined}
          style={{
            background: canConfirm ? '#E8FF47' : 'rgba(232,255,71,0.15)',
            color: canConfirm ? '#0F0E0D' : 'rgba(232,255,71,0.4)',
            border: 'none', borderRadius: 100,
            padding: '12px 20px', fontSize: 14,
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            letterSpacing: '0.1em',
            cursor: canConfirm ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            marginTop: 2,
            boxShadow: canConfirm ? '0 0 20px rgba(232,255,71,0.25)' : 'none',
          }}
          onMouseEnter={e => { if (canConfirm) e.currentTarget.style.background = '#f0ff6a' }}
          onMouseLeave={e => { if (canConfirm) e.currentTarget.style.background = '#E8FF47' }}
        >
          Confirm placement →
        </button>
      </div>
    </>
  )
}

// ── Shared slider row ─────────────────────────────────────────────────────────
function SliderRow({
  label, value, min, max, step, displayValue, accentColor,
  onChange, hint, centerTick,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  accentColor: string
  onChange: (v: number) => void
  hint?: string
  centerTick?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 10, color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 11, color: accentColor,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em',
        }}>
          {displayValue}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor, cursor: 'pointer' }}
        />
        {centerTick && (
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 1, height: 8,
            background: `${accentColor}55`,
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {hint && (
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.15)',
          letterSpacing: '0.06em',
        }}>
          {hint}
        </div>
      )}
    </div>
  )
}