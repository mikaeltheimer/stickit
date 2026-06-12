'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Sticker, TagReference, Locale } from '@/types/sticker'
import SidePanel from './SidePanel'
import HUD from './HUD'
import AddSticker, { PlacementModeData } from './AddSticker'
import PlacementUI from './AddSticker/PlacementUI'
import TagFilter from './TagFilter'
import { computeHalo, closestPointIndex, HaloResult } from '@/lib/halo'

interface WallProps {
  initialStickers: Sticker[]
  tags: TagReference[]
  locale: Locale
}

const MIN_SCALE = 0.1
const MAX_SCALE = 6

export default function Wall({ initialStickers, tags, locale }: WallProps) {
  const [stickers, setStickers] = useState<Sticker[]>(initialStickers)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [activeSticker, setActiveSticker] = useState<Sticker | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  // Placement
  const [placementData, setPlacementData] = useState<PlacementModeData | null>(null)
  const [halo, setHalo] = useState<HaloResult | null>(null)
  const [positionIndex, setPositionIndex] = useState(0)
  const [placementRotation, setPlacementRotation] = useState(0)
  const [placementScale, setPlacementScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null)


  const isDragging = useRef(false)
  const didDrag = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(scale)
  const txRef = useRef(tx)
  const tyRef = useRef(ty)
  const placementRotationRef = useRef(placementRotation)
  const placementDataRef = useRef(placementData)
  const haloRef = useRef(halo)
  const positionIndexRef = useRef(positionIndex)

  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { txRef.current = tx }, [tx])
  useEffect(() => { tyRef.current = ty }, [ty])
  useEffect(() => { placementRotationRef.current = placementRotation }, [placementRotation])
  useEffect(() => { placementDataRef.current = placementData }, [placementData])
  useEffect(() => { haloRef.current = halo }, [halo])
  useEffect(() => { positionIndexRef.current = positionIndex }, [positionIndex])

  const isPlacing = placementData !== null

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // ── Fit view ────────────────────────────────────────────────────────────────
  const fitView = useCallback((s: Sticker[], panelOpen = false) => {
    if (s.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    s.forEach(st => {
      minX = Math.min(minX, st.x - st.width / 2)
      minY = Math.min(minY, st.y - st.height / 2)
      maxX = Math.max(maxX, st.x + st.width / 2)
      maxY = Math.max(maxY, st.y + st.height / 2)
    })
    const pad = 100
    const vw = window.innerWidth - (panelOpen ? 340 : 0)
    const vh = window.innerHeight
    const fw = maxX - minX + pad * 2
    const fh = maxY - minY + pad * 2
    let ns = Math.min(vw / fw, vh / fh, 1.6)
    ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, ns))
    setScale(ns)
    setTx((vw - fw * ns) / 2 - (minX - pad) * ns)
    setTy((vh - fh * ns) / 2 - (minY - pad) * ns)
  }, [])

  useEffect(() => { fitView(stickers) }, []) // eslint-disable-line

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const zoomAt = useCallback((cx: number, cy: number, ns: number) => {
    const c = Math.min(MAX_SCALE, Math.max(MIN_SCALE, ns))
    const wx = (cx - txRef.current) / scaleRef.current
    const wy = (cy - tyRef.current) / scaleRef.current
    setScale(c); setTx(cx - wx * c); setTy(cy - wy * c)
  }, [])

  // ── Fit view on placement zone ───────────────────────────────────────────────
  const fitToHalo = useCallback((h: HaloResult) => {
    const { minX, minY, maxX, maxY } = h.bounds
    const pad = 60
    const vw = window.innerWidth
    const vh = window.innerHeight
    const fw = maxX - minX + pad * 2
    const fh = maxY - minY + pad * 2
    let ns = Math.min(vw / fw, vh / fh, 1.8)
    ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, ns))
    setScale(ns)
    setTx((vw - fw * ns) / 2 - (minX - pad) * ns)
    setTy((vh - fh * ns) / 2 - (minY - pad) * ns)
  }, [])

  // ── Wheel ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('#placement-ui') || target.closest('#panel') || target.closest('#tag-filter')) return
      e.preventDefault()
      if (placementDataRef.current) {
        // Rotate sticker with wheel
        const delta = e.deltaY > 0 ? 2 : -2
        setPlacementRotation(r => Math.max(-45, Math.min(45, r + delta)))
      } else {
        zoomAt(e.clientX, e.clientY, scaleRef.current * (e.deltaY < 0 ? 1.1 : 0.91))
      }
    }
    window.addEventListener('wheel', fn, { passive: false })
    return () => window.removeEventListener('wheel', fn)
  }, [zoomAt])

  // ── Mouse pan ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('#panel') || t.closest('#hud') || t.closest('#wordmark') ||
          t.closest('#placement-ui') || t.closest('#tag-filter')) return
      isDragging.current = true; didDrag.current = false
      dragStart.current = { x: e.clientX, y: e.clientY }
      panStart.current = { x: txRef.current, y: tyRef.current }
      document.body.style.cursor = 'grabbing'
    }
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      if (Math.hypot(dx, dy) > 4) didDrag.current = true
      setTx(panStart.current.x + dx); setTy(panStart.current.y + dy)
    }
    const onUp = () => { isDragging.current = false; document.body.style.cursor = 'crosshair' }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ── Touch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let lastT: TouchList | null = null
    let p0 = { x: 0, y: 0 }
    let t0: { x: number; y: number } | null = null
    let lastAngle: number | null = null

    const getTouchAngle = (t: TouchList) =>
      Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX) * (180 / Math.PI)

    const onStart = (e: TouchEvent) => {
      lastT = e.touches; lastAngle = null
      if (e.touches.length === 1) {
        t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        p0 = { x: txRef.current, y: tyRef.current }
      }
      if (e.touches.length === 2) lastAngle = getTouchAngle(e.touches)
    }

    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && t0) {
        setTx(p0.x + (e.touches[0].clientX - t0.x))
        setTy(p0.y + (e.touches[0].clientY - t0.y))
      } else if (e.touches.length === 2 && lastT && lastT.length >= 2) {
        const prevDist = Math.hypot(lastT[0].clientX - lastT[1].clientX, lastT[0].clientY - lastT[1].clientY)
        const newDist  = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
        const factor = newDist / prevDist

        if (placementDataRef.current) {
          // Pinch = scale sticker
          setPlacementScale(s => Math.max(0.95, Math.min(1.15, s * factor)))
          // Twist = rotate sticker
          const newAngle = getTouchAngle(e.touches)
          if (lastAngle !== null) {
            const delta = newAngle - lastAngle
            setPlacementRotation(r => Math.max(-45, Math.min(45, r + delta)))
          }
          lastAngle = newAngle
        } else {
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const my = (e.touches[0].clientY + e.touches[1].clientY) / 2
          zoomAt(mx, my, scaleRef.current * factor)
        }
      }
      lastT = e.touches
    }

    const onEnd = () => { lastT = null; t0 = null; lastAngle = null }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [zoomAt])

  // ── Enter placement ──────────────────────────────────────────────────────────
  const handleEnterPlacement = useCallback((data: PlacementModeData) => {
    setPlacementData(data)
    setPlacementRotation(0)
    setPlacementScale(1)
    setActiveSticker(null)

    // Compute halo
    const rects = data.stickers.map(s => ({
      x: s.x, y: s.y, width: s.width, height: s.height,
    }))

    // First sticker — no halo needed, place at origin
    if (rects.length === 0) {
      setHalo(null)
      setPositionIndex(0)
      return
    }

    const h = computeHalo(rects)
    if (h) {
      setHalo(h)
      setPositionIndex(0)
      // Fit view to show the halo
      setTimeout(() => fitToHalo(h), 50)
    }
  }, [fitToHalo])

  const handleExitPlacement = useCallback(() => {
    setPlacementData(null)
    setHalo(null)
    setPositionIndex(0)
  }, [])

  // ── Sync current position when index or halo changes ────────────────────────
  useEffect(() => {
    if (!placementData) { setCurrentPos(null); return }
    if (!halo || halo.points.length === 0) {
      setCurrentPos({ x: 600, y: 400 }); return
    }
    setCurrentPos(halo.points[positionIndex % halo.points.length])
  }, [positionIndex, halo, placementData])

  useEffect(() => {
    if (!halo) return
    console.log('Halo points sample:', halo.points.slice(0, 5))
    console.log('Halo bounds:', halo.bounds)
    console.log('Canvas size:', halo.canvas.width, halo.canvas.height)
  }, [halo])

  const scaledW = placementData ? placementData.naturalWidth  * placementScale : 0
  const scaledH = placementData ? placementData.naturalHeight * placementScale : 0

  // ── Sticker click ────────────────────────────────────────────────────────────
  const handleWorldClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didDrag.current || isPlacing) return
    const el = (e.target as HTMLElement).closest('[data-sticker-id]') as HTMLElement | null
    if (!el) { setActiveSticker(null); return }
    const found = stickers.find(s => s.id === el.dataset.stickerId) ?? null
    if (found?.id === activeSticker?.id) { setActiveSticker(null); return }
    setActiveSticker(found)
  }

  // ── Placement confirm ────────────────────────────────────────────────────────
  const handlePlacementConfirm = () => {
    if (!placementData || !currentPos) return
    placementData.onConfirm({
      x: currentPos.x,
      y: currentPos.y,
      width: scaledW,
      height: scaledH,
      rotation: placementRotation,
    })
  }

  // ── Halo canvas URL ──────────────────────────────────────────────────────────
  const haloDataUrl = halo?.canvas.toDataURL() ?? null

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
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          transformOrigin: '0 0',
          transform: `translate(${tx}px,${ty}px) scale(${scale})`,
          zIndex: 2,
          cursor: isPlacing ? 'default' : 'crosshair',
        }}
      >
        {/* Halo overlay */}
        {isPlacing && halo && haloDataUrl && (
          <img
            src={haloDataUrl}
            alt=""
            style={{
              position: 'absolute',
              left: halo.bounds.minX,
              top:  halo.bounds.minY,
              width:  halo.bounds.maxX - halo.bounds.minX,
              height: halo.bounds.maxY - halo.bounds.minY,
              pointerEvents: 'none',
              zIndex: 5,
              animation: 'halo-pulse 2.5s ease-in-out infinite',
            }}
          />
        )}

        <style>{`
          @keyframes halo-pulse {
            0%, 100% { opacity: 0.7; }
            50%       { opacity: 1; }
          }
        `}</style>

        {/* Existing stickers */}
        {stickers.map((s, idx) => (
          <div
            key={s.id}
            data-sticker-id={s.id}
            style={{
              position: 'absolute', left: s.x, top: s.y,
              width: s.width, height: s.height,
              transform: `translate(-50%,-50%) rotate(${s.rotation}deg)`,
              cursor: isPlacing ? 'default' : 'pointer',
              opacity: isPlacing
                ? 0.45
                : activeTag
                  ? (s.tags.includes(activeTag) ? 1 : 0.12)
                  : [1, 0.95, 0.97, 0.93, 1, 0.96][idx % 6],
              filter: !isPlacing && activeTag && s.tags.includes(activeTag)
                ? 'drop-shadow(0 0 8px rgba(232,255,71,0.5))'
                : 'none',
              transition: 'opacity 0.3s ease, filter 0.3s ease',
              zIndex: activeSticker?.id === s.id ? 20 : 1,
            }}
          >
            <img
              src={s.image_url} alt={s.title ?? ''}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            />
          </div>
        ))}

        {/* Placement preview */}
        {isPlacing && currentPos && (
          <div style={{
            position: 'absolute',
            left: currentPos.x,
            top:  currentPos.y,
            width: scaledW, height: scaledH,
            transform: `translate(-50%,-50%) rotate(${placementRotation}deg)`,
            zIndex: 30, pointerEvents: 'none',
            transition: 'left 0.12s ease, top 0.12s ease',
          }}>
            <img
              src={placementData!.imageUrl} alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                opacity: 0.85,
                filter: 'drop-shadow(0 0 10px rgba(232,255,71,0.6)) drop-shadow(0 0 2px rgba(255,255,255,0.8))',
                pointerEvents: 'none',
              }}
            />
          </div>
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
          <TagFilter
            tags={tags} stickers={stickers}
            activeTag={activeTag} locale={locale}
            onTagFilter={slug => setActiveTag(slug)}
          />
          <div id="panel">
            <SidePanel
              sticker={activeSticker} tags={tags} locale={locale}
              activeTag={activeTag}
              onClose={() => setActiveSticker(null)}
              onTagFilter={slug => setActiveTag(prev => prev === slug ? null : slug)}
            />
          </div>
        </>
      )}

      {/* Placement UI */}
      {isPlacing && (
        <div id="placement-ui">
          <PlacementUI
            hasPosition={currentPos !== null}
            canConfirm={currentPos !== null}
            rotation={placementRotation}
            scale={placementScale}
            positionIndex={positionIndex}
            totalPositions={halo?.points.length ?? 1}
            onRotationChange={setPlacementRotation}
            onScaleChange={setPlacementScale}
            onPositionChange={setPositionIndex}
            onConfirm={handlePlacementConfirm}
            onCancel={() => placementData?.onCancel()}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Add sticker */}
      <AddSticker
        stickers={stickers} tags={tags}
        onStickerAdded={s => setStickers(prev => [...prev, s])}
        onEnterPlacement={handleEnterPlacement}
        onExitPlacement={handleExitPlacement}
      />
    </>
  )
}