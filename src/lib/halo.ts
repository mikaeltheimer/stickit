export interface Rect {
  x: number; y: number; width: number; height: number
}

export interface Point {
  x: number; y: number
}

export interface HaloResult {
  points: Point[]
  canvas: HTMLCanvasElement
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

// Négatif = le sticker chevauche légèrement le blob existant
export const HALO_OFFSET = -35

const CANVAS_SCALE = 0.5
const BLUR_RADIUS  = 10
const THRESHOLD    = 30
const N_POINTS     = 200

export function computeHalo(stickers: Rect[]): HaloResult | null {
  if (stickers.length === 0) return null

  // ── 1. Bounds ──────────────────────────────────────────────────────────────
  const pad = Math.abs(HALO_OFFSET) + 80
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  stickers.forEach(s => {
    minX = Math.min(minX, s.x - s.width  / 2 - pad)
    minY = Math.min(minY, s.y - s.height / 2 - pad)
    maxX = Math.max(maxX, s.x + s.width  / 2 + pad)
    maxY = Math.max(maxY, s.y + s.height / 2 + pad)
  })

  const cw = Math.ceil((maxX - minX) * CANVAS_SCALE)
  const ch = Math.ceil((maxY - minY) * CANVAS_SCALE)

  const toC = (wx: number, wy: number) => ({
    cx: (wx - minX) * CANVAS_SCALE,
    cy: (wy - minY) * CANVAS_SCALE,
  })
  const toW = (cx: number, cy: number) => ({
    wx: cx / CANVAS_SCALE + minX,
    wy: cy / CANVAS_SCALE + minY,
  })

  // ── 2. Draw mask with HALO_OFFSET ─────────────────────────────────────────
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = cw; maskCanvas.height = ch
  const mctx = maskCanvas.getContext('2d')!

  stickers.forEach(s => {
    const { cx, cy } = toC(s.x, s.y)
    const cW = s.width  * CANVAS_SCALE
    const cH = s.height * CANVAS_SCALE
    const off = HALO_OFFSET * CANVAS_SCALE // négatif = plus petit que le sticker
    const rW = cW + off * 2
    const rH = cH + off * 2
    if (rW <= 0 || rH <= 0) return
    mctx.fillStyle = 'white'
    mctx.beginPath()
    mctx.roundRect(cx - rW/2, cy - rH/2, rW, rH, 4)
    mctx.fill()
  })

  // ── 3. Blur → spread ──────────────────────────────────────────────────────
  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = cw; blurCanvas.height = ch
  const bctx = blurCanvas.getContext('2d')!
  bctx.filter = `blur(${BLUR_RADIUS}px)`
  bctx.drawImage(maskCanvas, 0, 0)
  bctx.filter = 'none'

  // ── 4. Binary mask ─────────────────────────────────────────────────────────
  const blurData = bctx.getImageData(0, 0, cw, ch).data
  const maskArray = new Uint8Array(cw * ch)
  for (let i = 0; i < cw * ch; i++) {
    const value = Math.max(blurData[i * 4 + 3], blurData[i * 4])
    if (value > THRESHOLD) maskArray[i] = 1
  }

  // ── 5. Centroid ────────────────────────────────────────────────────────────
  const centroidCX = stickers.reduce((s, r) => s + toC(r.x, r.y).cx, 0) / stickers.length
  const centroidCY = stickers.reduce((s, r) => s + toC(r.x, r.y).cy, 0) / stickers.length

  function isInMask(px: number, py: number): boolean {
    const ix = Math.round(px); const iy = Math.round(py)
    if (ix < 0 || iy < 0 || ix >= cw || iy >= ch) return false
    return maskArray[iy * cw + ix] === 1
  }

  // ── 6. Perimeter points — edge of mask ────────────────────────────────────
  const perimeterPoints: Point[] = []

  for (let i = 0; i < N_POINTS; i++) {
    const angle = (i / N_POINTS) * Math.PI * 2
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const maxR = Math.sqrt(cw * cw + ch * ch)

    let lastInside = -1
    for (let r = 1; r < maxR; r++) {
      const px = centroidCX + dx * r
      const py = centroidCY + dy * r
      if (px < 0 || py < 0 || px >= cw || py >= ch) break
      if (isInMask(px, py)) {
        lastInside = r
      } else if (lastInside >= 0) {
        break
      }
    }

    const r = lastInside > 0 ? lastInside : 0
    const { wx, wy } = toW(centroidCX + dx * r, centroidCY + dy * r)
    perimeterPoints.push({ x: wx, y: wy })
  }

  // ── 7. Render — halo diffus, pas de ligne visible ──────────────────────────
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = cw; finalCanvas.height = ch
    const fctx = finalCanvas.getContext('2d')!

    if (perimeterPoints.length > 1) {
    const pts = perimeterPoints.map(p => toC(p.x, p.y))

    // On dessine la ligne plusieurs fois avec des blur croissants
    // Résultat : un halo diffus sans ligne nette visible
    const layers = [
        { lineWidth: 40, alpha: 0.06, blur: 20 },
        { lineWidth: 24, alpha: 0.10, blur: 14 },
        { lineWidth: 12, alpha: 0.18, blur: 8  },
        { lineWidth: 4,  alpha: 0.22, blur: 4  },
    ]

    for (const layer of layers) {
        fctx.save()
        fctx.filter = `blur(${layer.blur}px)`
        fctx.beginPath()
        pts.forEach((p, i) => i === 0 ? fctx.moveTo(p.cx, p.cy) : fctx.lineTo(p.cx, p.cy))
        fctx.closePath()
        fctx.strokeStyle = `rgba(232, 255, 71, ${layer.alpha})`
        fctx.lineWidth = layer.lineWidth
        fctx.stroke()
        fctx.restore()
    }
    }

  return {
    points: perimeterPoints,
    canvas: finalCanvas,
    bounds: { minX, minY, maxX, maxY },
  }
}

export function closestPointIndex(points: Point[], wx: number, wy: number): number {
  let best = 0; let bestDist = Infinity
  points.forEach((p, i) => {
    const d = Math.hypot(p.x - wx, p.y - wy)
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}