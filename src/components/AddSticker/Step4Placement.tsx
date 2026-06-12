'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sticker } from '@/types/sticker'

interface Step4PlacementProps {
  imageUrl: string
  stickers: Sticker[]
  onNext: (x: number, y: number, width: number, height: number, rotation: number) => void
  onBack: () => void
}

interface Candidate {
  x: number
  y: number
  rotation: number
}

const STICKER_SIZE = 150
const BBOX_FACTOR = 0.82
const MAX_CENTROID_DISTANCE = 600
const CANDIDATE_COUNT = 8

// ── Collision helpers ─────────────────────────────────────────────────────────
function effectiveBbox(x: number, y: number, w: number, h: number, factor = BBOX_FACTOR) {
  return {
    left: x - (w * factor) / 2,
    right: x + (w * factor) / 2,
    top: y - (h * factor) / 2,
    bottom: y + (h * factor) / 2,
  }
}

function bboxOverlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  factor = BBOX_FACTOR
) {
  const a = effectiveBbox(ax, ay, aw, ah, factor)
  const b = effectiveBbox(bx, by, bw, bh, factor)
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function touchesAny(cx: number, cy: number, cw: number, ch: number, stickers: Sticker[]) {
  const margin = 8
  const a = {
    left: cx - cw / 2 - margin, right: cx + cw / 2 + margin,
    top: cy - ch / 2 - margin, bottom: cy + ch / 2 + margin,
  }
  return stickers.some(s => {
    const b = effectiveBbox(s.x, s.y, s.width, s.height, 1)
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  })
}

function isValidPosition(cx: number, cy: number, cw: number, ch: number, stickers: Sticker[]) {
  if (stickers.length === 0) return true

  // Must not overlap
  for (const s of stickers) {
    if (bboxOverlaps(cx, cy, cw, ch, s.x, s.y, s.width, s.height)) return false
  }

  // Must touch at least one
  if (!touchesAny(cx, cy, cw, ch, stickers)) return false

  // Must be within centroid distance
  const centroidX = stickers.reduce((sum, s) => sum + s.x, 0) / stickers.length
  const centroidY = stickers.reduce((sum, s) => sum + s.y, 0) / stickers.length
  if (Math.hypot(cx - centroidX, cy - centroidY) > MAX_CENTROID_DISTANCE) return false

  return true
}

// ── Generate candidates ───────────────────────────────────────────────────────
function generateCandidates(stickers: Sticker[]): Candidate[] {
  if (stickers.length === 0) {
    return [{ x: 600, y: 400, rotation: 0 }]
  }

  const candidates: Candidate[] = []
  const rotations = [-8, -5, -3, 0, 3, 5, 8, 10]
  const offsets = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 0.7, dy: 0.7 }, { dx: -0.7, dy: 0.7 },
    { dx: 0.7, dy: -0.7 }, { dx: -0.7, dy: -0.7 },
  ]

  for (const s of stickers) {
    for (const offset of offsets) {
      if (candidates.length >= CANDIDATE_COUNT * 3) break
      const gap = (STICKER_SIZE * BBOX_FACTOR) / 2 + (s.width * BBOX_FACTOR) / 2 + 4
      const cx = s.x + offset.dx * gap
      const cy = s.y + offset.dy * gap
      const rot = rotations[candidates.length % rotations.length]

      if (isValidPosition(cx, cy, STICKER_SIZE, STICKER_SIZE, stickers)) {
        candidates.push({ x: cx, y: cy, rotation: rot })
      }
    }
  }

  // Deduplicate nearby candidates
  const deduped: Candidate[] = []
  for (const c of candidates) {
    const tooClose = deduped.some(d => Math.hypot(d.x - c.x, d.y - c.y) < STICKER_SIZE * 0.8)
    if (!tooClose) deduped.push(c)
    if (deduped.length >= CANDIDATE_COUNT) break
  }

  return deduped
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Step4Placement({ imageUrl, stickers, onNext, onBack }: Step4PlacementProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [manualPos, setManualPos] = useState<{ x: number; y: number } | null>(null)
  const [manualValid, setManualValid] = useState(false)
  const [mode, setMode] = useState<'suggestions' | 'manual'>('suggestions')

  const scaleRef = useRef(scale)
  const txRef = useRef(tx)
  const tyRef = useRef(ty)
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { txRef.current = tx }, [tx])
  useEffect(() => { tyRef.current = ty }, [ty])

  // Generate candidates + fit view on mount
  useEffect(() => {
    const c = generateCandidates(stickers)
    setCandidates(c)
    fitToCandidate(c[0], stickers)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fit view around a candidate ─────────────────────────────────────────
  const fitToCandidate = useCallback((candidate: Candidate | undefined, allStickers: Sticker[]) => {
    if (!candidate) return
    const vw = window.innerWidth
    const vh = window.innerHeight - 160 // account for UI chrome

    // Include nearby stickers in view
    const nearby = allStickers.filter(s =>
      Math.hypot(s.x - candidate.x, s.y - candidate.y) < 400
    )

    const points = [
      ...nearby.map(s => ({ x: s.x, y: s.y })),
      { x: candidate.x, y: candidate.y },
    ]

    if (points.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    points.forEach(p => {
      minX = Math.min(minX, p.x - 120)
      minY = Math.min(minY, p.y - 120)
      maxX = Math.max(maxX, p.x + 120)
      maxY = Math.max(maxY, p.y + 120)
    })

    const pad = 80
    const fw = maxX - minX + pad * 2
    const fh = maxY - minY + pad * 2
    const newScale = Math.min(vw / fw, vh / fh, 2)
    const newTx = (vw - fw * newScale) / 2 - (minX - pad) * newScale
    const newTy = (vh - fh * newScale) / 2 - (minY - pad) * newScale

    setScale(newScale)
    setTx(newTx)
    setTy(newTy)
  }, [])

  // Auto-fit when active candidate changes
  useEffect(() => {
    if (mode === 'suggestions' && candidates[activeIdx]) {
      fitToCandidate(candidates[activeIdx], stickers)
    }
  }, [activeIdx, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard nav ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode !== 'suggestions') return
      if (e.key === 'ArrowLeft') setActiveIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(candidates.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, candidates.length])

  // ── Manual click on canvas ───────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'manual') return
    const rect = e.currentTarget.getBoundingClientRect()
    const worldX = (e.clientX - rect.left - txRef.current) / scaleRef.current
    const worldY = (e.clientY - rect.top - tyRef.current) / scaleRef.current
    const valid = isValidPosition(worldX, worldY, STICKER_SIZE, STICKER_SIZE, stickers)
    setManualPos({ x: worldX, y: worldY })
    setManualValid(valid)
  }

  // ── Active position ──────────────────────────────────────────────────────
  const activeCandidate = mode === 'suggestions'
    ? candidates[activeIdx]
    : manualPos ? { x: manualPos.x, y: manualPos.y, rotation: 0 } : null

  const canConfirm = mode === 'suggestions'
    ? candidates.length > 0
    : manualPos !== null && manualValid

  const handleConfirm = () => {
    if (!activeCandidate) return
    onNext(activeCandidate.x, activeCandidate.y, STICKER_SIZE, STICKER_SIZE, activeCandidate.rotation)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Mode toggle */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 12,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 100, padding: 4,
      }}>
        {(['suggestions', 'manual'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, borderRadius: 100, border: 'none',
              padding: '7px 0', fontSize: 12, fontFamily: 'inherit',
              letterSpacing: '0.04em', cursor: 'pointer',
              background: mode === m ? 'rgba(232,255,71,0.15)' : 'transparent',
              color: mode === m ? '#E8FF47' : '#7A756E',
              transition: 'all 0.15s',
            }}
          >
            {m === 'suggestions' ? '✦ Suggestions' : '✎ Place manually'}
          </button>
        ))}
      </div>

      {/* Mini canvas */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: 340,
          background: '#0F0E0D',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          cursor: mode === 'manual' ? 'crosshair' : 'default',
          border: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        {/* Grain */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4, mixBlendMode: 'overlay' as const }}>
          <filter id="pnoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#pnoise)"/>
        </svg>

        {/* World */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          transformOrigin: '0 0',
          transform: `translate(${tx}px,${ty}px) scale(${scale})`,
        }}>
          {/* Existing stickers */}
          {stickers.map(s => (
            <div key={s.id} style={{
              position: 'absolute',
              left: s.x, top: s.y,
              width: s.width, height: s.height,
              transform: `translate(-50%,-50%) rotate(${s.rotation}deg)`,
            }}>
              <img
                src={s.image_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              />
            </div>
          ))}

          {/* Suggestion indicators */}
          {mode === 'suggestions' && candidates.map((c, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); setActiveIdx(i) }}
              style={{
                position: 'absolute',
                left: c.x, top: c.y,
                width: STICKER_SIZE, height: STICKER_SIZE,
                transform: `translate(-50%,-50%) rotate(${c.rotation}deg)`,
                cursor: 'pointer',
                zIndex: i === activeIdx ? 10 : 5,
              }}
            >
              {i === activeIdx ? (
                // Active — show actual sticker semi-transparent
                <img
                  src={imageUrl}
                  alt=""
                  style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    opacity: 0.75, pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 8px rgba(232,255,71,0.6))',
                  }}
                />
              ) : (
                // Inactive — dot indicator
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'rgba(232,255,71,0.3)',
                  border: '1px solid rgba(232,255,71,0.5)',
                }} />
              )}
            </div>
          ))}

          {/* Manual placement preview */}
          {mode === 'manual' && manualPos && (
            <div style={{
              position: 'absolute',
              left: manualPos.x, top: manualPos.y,
              width: STICKER_SIZE, height: STICKER_SIZE,
              transform: 'translate(-50%,-50%)',
              zIndex: 10,
            }}>
              <img
                src={imageUrl}
                alt=""
                style={{
                  width: '100%', height: '100%', objectFit: 'contain',
                  opacity: manualValid ? 0.75 : 0.3,
                  pointerEvents: 'none',
                  filter: manualValid
                    ? 'drop-shadow(0 0 8px rgba(0,255,156,0.6))'
                    : 'drop-shadow(0 0 8px rgba(255,45,120,0.6))',
                }}
              />
              {!manualValid && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  fontSize: 10, color: '#FF2D78',
                  background: 'rgba(0,0,0,0.8)',
                  padding: '3px 8px', borderRadius: 4,
                  whiteSpace: 'nowrap', letterSpacing: '0.04em',
                }}>
                  Invalid position
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual hint overlay */}
        {mode === 'manual' && !manualPos && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.6,
            }}>
              Click on the wall to place your sticker<br />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>
                Must touch an existing sticker
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion navigation */}
      {mode === 'suggestions' && candidates.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '12px 0',
        }}>
          <NavButton
            onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
            disabled={activeIdx === 0}
          >
            ←
          </NavButton>
          <span style={{
            fontSize: 11, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.1em', minWidth: 60, textAlign: 'center',
          }}>
            {activeIdx + 1} / {candidates.length}
          </span>
          <NavButton
            onClick={() => setActiveIdx(i => Math.min(candidates.length - 1, i + 1))}
            disabled={activeIdx === candidates.length - 1}
          >
            →
          </NavButton>
        </div>
      )}

      {/* No candidates warning */}
      {mode === 'suggestions' && candidates.length === 0 && (
        <div style={{
          fontSize: 12, color: '#FF2D78', textAlign: 'center',
          padding: '12px 0', letterSpacing: '0.04em',
        }}>
          No valid positions found — try placing manually.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={handleConfirm} disabled={!canConfirm} style={{ flex: 1 }}>
          Confirm placement →
        </PrimaryButton>
      </div>
    </div>
  )
}

// ── Shared buttons ────────────────────────────────────────────────────────────
function NavButton({ onClick, disabled, children }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 100, width: 36, height: 36,
        color: disabled ? 'rgba(255,255,255,0.15)' : '#F0EDE8',
        fontSize: 16, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function PrimaryButton({ onClick, children, disabled, style }: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        background: '#E8FF47', color: '#0F0E0D',
        border: 'none', borderRadius: 100,
        padding: '10px 20px', fontSize: 13,
        fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.04em',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#f0ff6a' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = '#E8FF47' }}
    >
      {children}
    </button>
  )
}

function GhostButton({ onClick, children }: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none',
        color: '#7A756E', borderRadius: 100,
        padding: '10px 20px', fontSize: 13,
        cursor: 'pointer', fontFamily: 'inherit',
        letterSpacing: '0.04em', transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#F0EDE8'}
      onMouseLeave={e => e.currentTarget.style.color = '#7A756E'}
    >
      {children}
    </button>
  )
}