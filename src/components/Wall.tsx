'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Sticker, TagReference, Locale } from '@/types/sticker'
import SidePanel from './SidePanel'
import HUD from './HUD'
import AddSticker, { PlacementModeData } from './AddSticker'
import PlacementUI from './AddSticker/PlacementUI'

interface WallProps {
  initialStickers: Sticker[]
  tags: TagReference[]
  locale: Locale
}

const MIN_SCALE = 0.1
const MAX_SCALE = 6
const STICKER_SIZE = 150
const BBOX_FACTOR = 0.82
const MAX_CENTROID_DISTANCE = 600
const CANDIDATE_COUNT = 8

// ── Collision helpers ─────────────────────────────────────────────────────────
function effectiveBbox(x: number, y: number, w: number, h: number, factor = BBOX_FACTOR) {
  return {
    left: x - (w * factor) / 2, right: x + (w * factor) / 2,
    top: y - (h * factor) / 2, bottom: y + (h * factor) / 2,
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
  for (const s of stickers) {
    if (bboxOverlaps(cx, cy, cw, ch, s.x, s.y, s.width, s.height)) return false
  }
  if (!touchesAny(cx, cy, cw, ch, stickers)) return false
  const centroidX = stickers.reduce((sum, s) => sum + s.x, 0) / stickers.length
  const centroidY = stickers.reduce((sum, s) => sum + s.y, 0) / stickers.length
  if (Math.hypot(cx - centroidX, cy - centroidY) > MAX_CENTROID_DISTANCE) return false
  return true
}

function generateCandidates(stickers: Sticker[]) {
  if (stickers.length === 0) return [{ x: 600, y: 400, rotation: 0 }]
  const candidates: { x: number; y: number; rotation: number }[] = []
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
  const deduped: typeof candidates = []
  for (const c of candidates) {
    const tooClose = deduped.some(d => Math.hypot(d.x - c.x, d.y - c.y) < STICKER_SIZE * 0.8)
    if (!tooClose) deduped.push(c)
    if (deduped.length >= CANDIDATE_COUNT) break
  }
  return deduped
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Wall({ initialStickers, tags, locale }: WallProps) {
  const [stickers, setStickers] = useState<Sticker[]>(initialStickers)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [activeSticker, setActiveSticker] = useState<Sticker | null>(null)

  // Placement mode
  const [placementData, setPlacementData] = useState<PlacementModeData | null>(null)
  const [placementMode, setPlacementMode] = useState<'suggestions' | 'manual'>('suggestions')
  const [candidates, setCandidates] = useState<{ x: number; y: number; rotation: number }[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [manualPos, setManualPos] = useState<{ x: number; y: number } | null>(null)
  const [manualValid, setManualValid] = useState<boolean | null>(null)

  const isDragging = useRef(false)
  const didDrag = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(scale)
  const txRef = useRef(tx)
  const tyRef = useRef(ty)

  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { txRef.current = tx }, [tx])
  useEffect(() => { tyRef.current = ty }, [ty])

  const isPlacing = placementData !== null

  // ── Fit view ──────────────────────────────────────────────────────────────
  const fitView = useCallback((s: Sticker[], panelOpen = false) => {
    if (s.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    s.forEach(st => {
      minX = Math.min(minX, st.x - st.width / 2); minY = Math.min(minY, st.y - st.height / 2)
      maxX = Math.max(maxX, st.x + st.width / 2); maxY = Math.max(maxY, st.y + st.height / 2)
    })
    const pad = 100
    const vw = window.innerWidth - (panelOpen ? 340 : 0)
    const vh = window.innerHeight
    const fw = maxX - minX + pad * 2; const fh = maxY - minY + pad * 2
    let ns = Math.min(vw / fw, vh / fh, 1.6)
    ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, ns))
    setScale(ns); setTx((vw - fw * ns) / 2 - (minX - pad) * ns); setTy((vh - fh * ns) / 2 - (minY - pad) * ns)
  }, [])

  useEffect(() => { fitView(stickers) }, []) // eslint-disable-line

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const zoomAt = useCallback((cx: number, cy: number, ns: number) => {
    const c = Math.min(MAX_SCALE, Math.max(MIN_SCALE, ns))
    const wx = (cx - txRef.current) / scaleRef.current
    const wy = (cy - tyRef.current) / scaleRef.current
    setScale(c); setTx(cx - wx * c); setTy(cy - wy * c)
  }, [])

  // Focus on a candidate position
  const focusOnCandidate = useCallback((candidate: { x: number; y: number }, allStickers: Sticker[]) => {
    const nearby = allStickers.filter(s => Math.hypot(s.x - candidate.x, s.y - candidate.y) < 400)
    const points = [...nearby.map(s => ({ x: s.x, y: s.y })), { x: candidate.x, y: candidate.y }]
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    points.forEach(p => {
      minX = Math.min(minX, p.x - 120); minY = Math.min(minY, p.y - 120)
      maxX = Math.max(maxX, p.x + 120); maxY = Math.max(maxY, p.y + 120)
    })
    const pad = 80, vw = window.innerWidth, vh = window.innerHeight
    const fw = maxX - minX + pad * 2; const fh = maxY - minY + pad * 2
    const ns = Math.min(Math.min(vw / fw, vh / fh, 2), MAX_SCALE)
    setScale(ns); setTx((vw - fw * ns) / 2 - (minX - pad) * ns); setTy((vh - fh * ns) / 2 - (minY - pad) * ns)
  }, [])

  // ── Wheel ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: WheelEvent) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, scaleRef.current * (e.deltaY < 0 ? 1.1 : 0.91)) }
    window.addEventListener('wheel', fn, { passive: false })
    return () => window.removeEventListener('wheel', fn)
  }, [zoomAt])

  // ── Mouse pan ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('#panel') || t.closest('#hud') || t.closest('#wordmark') || t.closest('#placement-ui')) return
      isDragging.current = true; didDrag.current = false
      dragStart.current = { x: e.clientX, y: e.clientY }
      panStart.current = { x: txRef.current, y: tyRef.current }
      document.body.style.cursor = 'grabbing'
    }
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - dragStart.current.x; const dy = e.clientY - dragStart.current.y
      if (Math.hypot(dx, dy) > 4) didDrag.current = true
      setTx(panStart.current.x + dx); setTy(panStart.current.y + dy)
    }
    const onUp = () => { isDragging.current = false; document.body.style.cursor = isPlacing ? 'crosshair' : 'crosshair' }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isPlacing])

  // ── Touch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let lastT: TouchList | null = null; let p0 = { x: 0, y: 0 }; let t0: { x: number; y: number } | null = null
    const onStart = (e: TouchEvent) => {
      lastT = e.touches
      if (e.touches.length === 1) { t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; p0 = { x: txRef.current, y: tyRef.current } }
    }
    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && t0) { setTx(p0.x + (e.touches[0].clientX - t0.x)); setTy(p0.y + (e.touches[0].clientY - t0.y)) }
      else if (e.touches.length === 2 && lastT && lastT.length === 2) {
        const prev = Math.hypot(lastT[0].clientX - lastT[1].clientX, lastT[0].clientY - lastT[1].clientY)
        const curr = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2
        zoomAt(mx, my, scaleRef.current * (curr / prev))
      }
      lastT = e.touches
    }
    const onEnd = () => { lastT = null; t0 = null }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
  }, [zoomAt])

  // ── Keyboard nav for placement ─────────────────────────────────────────────
  useEffect(() => {
    if (!isPlacing) return
    const fn = (e: KeyboardEvent) => {
      if (placementMode !== 'suggestions') return
      if (e.key === 'ArrowLeft') setActiveIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(candidates.length - 1, i + 1))
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [isPlacing, placementMode, candidates.length])

  // Focus when active candidate changes
  useEffect(() => {
    if (!isPlacing || placementMode !== 'suggestions' || !candidates[activeIdx]) return
    focusOnCandidate(candidates[activeIdx], stickers)
  }, [activeIdx, placementMode, isPlacing]) // eslint-disable-line

  // ── Enter placement mode ───────────────────────────────────────────────────
  const handleEnterPlacement = useCallback((data: PlacementModeData) => {
    const c = generateCandidates(data.stickers)
    setCandidates(c); setActiveIdx(0); setManualPos(null); setManualValid(null)
    setPlacementMode('suggestions'); setPlacementData(data); setActiveSticker(null)
    if (c[0]) focusOnCandidate(c[0], data.stickers)
  }, [focusOnCandidate])

  const handleExitPlacement = useCallback(() => {
    setPlacementData(null); setManualPos(null); setManualValid(null)
  }, [])

  // ── Canvas click ──────────────────────────────────────────────────────────
  const handleWorldClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didDrag.current) return

    if (isPlacing && placementMode === 'manual') {
      const rect = e.currentTarget.getBoundingClientRect()
      const wx = (e.clientX - rect.left - txRef.current) / scaleRef.current
      const wy = (e.clientY - rect.top - tyRef.current) / scaleRef.current
      const valid = isValidPosition(wx, wy, STICKER_SIZE, STICKER_SIZE, stickers)
      setManualPos({ x: wx, y: wy }); setManualValid(valid)
      return
    }

    if (!isPlacing) {
      const el = (e.target as HTMLElement).closest('[data-sticker-id]') as HTMLElement | null
      if (!el) { setActiveSticker(null); return }
      const found = stickers.find(s => s.id === el.dataset.stickerId) ?? null
      if (found?.id === activeSticker?.id) { setActiveSticker(null); return }
      setActiveSticker(found)
    }
  }

  // ── Placement confirm ─────────────────────────────────────────────────────
  const handlePlacementConfirm = () => {
    if (!placementData) return
    let pos: { x: number; y: number; rotation: number } | null = null
    if (placementMode === 'suggestions' && candidates[activeIdx]) {
      pos = candidates[activeIdx]
    } else if (placementMode === 'manual' && manualPos && manualValid) {
      pos = { ...manualPos, rotation: 0 }
    }
    if (!pos) return
    placementData.onConfirm({ x: pos.x, y: pos.y, width: STICKER_SIZE, height: STICKER_SIZE, rotation: pos.rotation })
  }

  const canConfirmPlacement = placementMode === 'suggestions'
    ? candidates.length > 0
    : manualPos !== null && manualValid === true

  const activeCandidate = placementMode === 'suggestions'
    ? candidates[activeIdx]
    : (manualPos && manualValid !== null) ? { ...manualPos, rotation: 0 } : null

  return (
    <>
      {/* Grain */}
      <svg style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 3, opacity: 0.55, mixBlendMode: 'overlay' }} xmlns="http://www.w3.org/2000/svg">
        <filter id="fnoise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
          <feComponentTransfer in="grey"><feFuncA type="linear" slope="0.9"/></feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#fnoise)"/>
      </svg>

      {/* Vignette */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

      {/* Wordmark */}
      {!isPlacing && (
        <div id="wordmark" style={{ position: 'fixed', top: 24, left: 28, zIndex: 200, pointerEvents: 'none' }}>
          <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 32, color: '#E8FF47', lineHeight: 1, letterSpacing: '0.08em', textShadow: '0 0 20px rgba(232,255,71,0.5)' }}>
            StickIt
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', marginTop: 4, fontStyle: 'italic', fontWeight: 300 }}>
            Let&apos;s build the biggest sticker wall ever
          </div>
        </div>
      )}

      {/* World */}
      <div
        onClick={handleWorldClick}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          transformOrigin: '0 0',
          transform: `translate(${tx}px,${ty}px) scale(${scale})`,
          zIndex: 2,
          cursor: isPlacing && placementMode === 'manual' ? 'crosshair' : 'default',
        }}
      >
        {/* Existing stickers */}
        {stickers.map((s, idx) => (
          <div
            key={s.id}
            data-sticker-id={s.id}
            style={{
              position: 'absolute', left: s.x, top: s.y, width: s.width, height: s.height,
              transform: `translate(-50%,-50%) rotate(${s.rotation}deg)`,
              cursor: isPlacing ? 'default' : 'pointer',
              opacity: isPlacing ? 0.5 : [1, 0.95, 0.97, 0.93, 1, 0.96][idx % 6],
              transition: 'opacity 0.3s ease',
              zIndex: activeSticker?.id === s.id ? 20 : 1,
            }}
          >
            <img src={s.image_url} alt={s.title ?? ''} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
          </div>
        ))}

        {/* Placement preview */}
        {isPlacing && placementData && activeCandidate && (
          <>
            {/* Suggestion dots */}
            {placementMode === 'suggestions' && candidates.map((c, i) => i !== activeIdx && (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); setActiveIdx(i) }}
                style={{
                  position: 'absolute', left: c.x, top: c.y,
                  width: 12, height: 12,
                  transform: 'translate(-50%,-50%)',
                  borderRadius: '50%',
                  background: 'rgba(232,255,71,0.3)',
                  border: '1px solid rgba(232,255,71,0.6)',
                  cursor: 'pointer', zIndex: 5,
                }}
              />
            ))}

            {/* Active sticker preview */}
            <div style={{
              position: 'absolute',
              left: activeCandidate.x, top: activeCandidate.y,
              width: STICKER_SIZE, height: STICKER_SIZE,
              transform: `translate(-50%,-50%) rotate(${activeCandidate.rotation}deg)`,
              zIndex: 30, pointerEvents: 'none',
            }}>
              <img
                src={placementData.imageUrl}
                alt=""
                style={{
                  width: '100%', height: '100%', objectFit: 'contain',
                  opacity: placementMode === 'manual' && manualValid === false ? 0.3 : 0.8,
                  filter: placementMode === 'manual' && manualValid === false
                    ? 'drop-shadow(0 0 8px rgba(255,45,120,0.8))'
                    : 'drop-shadow(0 0 10px rgba(232,255,71,0.7)) drop-shadow(0 0 2px rgba(255,255,255,0.9))',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Normal UI */}
      {!isPlacing && (
        <>
          <div id="hud">
            <HUD
              scale={scale} panelOpen={activeSticker !== null} stickersCount={stickers.length}
              onZoomIn={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, scaleRef.current * 1.25)}
              onZoomOut={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, scaleRef.current * 0.8)}
              onFit={() => fitView(stickers, activeSticker !== null)}
            />
          </div>
          <div id="panel">
            <SidePanel sticker={activeSticker} tags={tags} locale={locale} onClose={() => setActiveSticker(null)} />
          </div>
        </>
      )}

      {/* Placement UI */}
      {isPlacing && (
        <div id="placement-ui">
          <PlacementUI
            mode={placementMode}
            activeIdx={activeIdx}
            totalCandidates={candidates.length}
            canConfirm={canConfirmPlacement}
            manualValid={manualValid}
            onModeChange={m => { setPlacementMode(m); setManualPos(null); setManualValid(null) }}
            onPrev={() => setActiveIdx(i => Math.max(0, i - 1))}
            onNext={() => setActiveIdx(i => Math.min(candidates.length - 1, i + 1))}
            onConfirm={handlePlacementConfirm}
            onCancel={() => placementData?.onCancel()}
          />
        </div>
      )}

      {/* Add sticker */}
      <AddSticker
        stickers={stickers}
        tags={tags}
        onStickerAdded={s => setStickers(prev => [...prev, s])}
        onEnterPlacement={handleEnterPlacement}
        onExitPlacement={handleExitPlacement}
      />
    </>
  )
}