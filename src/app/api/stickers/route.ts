import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const BBOX_FACTOR = 0.82
const MAX_CENTROID_DISTANCE = 600 // pixels — contrainte forme organique

// ── Helpers collision ────────────────────────────────────────────────────────

function effectiveBbox(s: { x: number; y: number; width: number; height: number; bbox_factor: number }) {
  const hw = (s.width  * s.bbox_factor) / 2
  const hh = (s.height * s.bbox_factor) / 2
  return { left: s.x - hw, right: s.x + hw, top: s.y - hh, bottom: s.y + hh }
}

function overlaps(a: ReturnType<typeof effectiveBbox>, b: ReturnType<typeof effectiveBbox>) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function touches(
  candidate: { x: number; y: number; width: number; height: number; bbox_factor: number },
  existing: { x: number; y: number; width: number; height: number; bbox_factor: number }
) {
  // Touch = bboxes à 100% + marge de 8px se chevauchent
  const margin = 8
  const a = { left: candidate.x - candidate.width/2 - margin, right: candidate.x + candidate.width/2 + margin,
              top:  candidate.y - candidate.height/2 - margin, bottom: candidate.y + candidate.height/2 + margin }
  const b = effectiveBbox({ ...existing, bbox_factor: 1 })
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('stickers')
    .select('id, author, title, message, url, tags, image_url, x, y, width, height, rotation, bbox_factor, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  let body: {
    author: string
    title?: string
    message?: string
    url?: string
    tags?: string[]
    image_url: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Validation basique ───────────────────────────────────────────────────
  if (!body.author?.trim())   return NextResponse.json({ error: 'Author required' }, { status: 400 })
  if (!body.image_url?.trim()) return NextResponse.json({ error: 'Image required' }, { status: 400 })
  if (typeof body.x !== 'number' || typeof body.y !== 'number') {
    return NextResponse.json({ error: 'Position required' }, { status: 400 })
  }
  if (body.tags && body.tags.length > 3) {
    return NextResponse.json({ error: 'Max 3 tags' }, { status: 400 })
  }
  if (body.message && body.message.length > 200) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  // ── Charger les stickers existants ───────────────────────────────────────
  const { data: existing, error: fetchError } = await supabase
    .from('stickers')
    .select('x, y, width, height, bbox_factor')

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const candidate = { ...body, bbox_factor: BBOX_FACTOR }
  const candidateBbox = effectiveBbox(candidate)

  // Vérifier collision — avec tolérance de chevauchement intentionnel
    const OVERLAP_TOLERANCE = 0.3 // 30% de chevauchement autorisé

    for (const s of existing) {
      const aLeft   = body.x - (body.width  * BBOX_FACTOR) / 2
      const aRight  = body.x + (body.width  * BBOX_FACTOR) / 2
      const aTop    = body.y - (body.height * BBOX_FACTOR) / 2
      const aBottom = body.y + (body.height * BBOX_FACTOR) / 2

      const bLeft   = s.x - (s.width  * s.bbox_factor) / 2
      const bRight  = s.x + (s.width  * s.bbox_factor) / 2
      const bTop    = s.y - (s.height * s.bbox_factor) / 2
      const bBottom = s.y + (s.height * s.bbox_factor) / 2

      const overlapX = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft))
      const overlapY = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop))
      const overlapArea = overlapX * overlapY
      const aArea = (aRight - aLeft) * (aBottom - aTop)
      const bArea = (bRight - bLeft) * (bBottom - bTop)
      const minArea = Math.min(aArea, bArea)

      // Reject only if overlap exceeds tolerance
      if (minArea > 0 && overlapArea / minArea > OVERLAP_TOLERANCE) {
        return NextResponse.json({ error: 'Position overlaps existing sticker' }, { status: 409 })
      }
    }

  // ── IP hash pour rate limiting ───────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const ip_hash = createHash('sha256').update(ip).digest('hex')

  // ── Insert ───────────────────────────────────────────────────────────────
  const { data: inserted, error: insertError } = await supabase
    .from('stickers')
    .insert({
      author:      body.author.trim(),
      title:       body.title?.trim() || null,
      message:     body.message?.trim() || null,
      url:         body.url?.trim() || null,
      tags:        body.tags ?? [],
      image_url:   body.image_url,
      x:           body.x,
      y:           body.y,
      width:       body.width,
      height:      body.height,
      rotation:    body.rotation,
      bbox_factor: BBOX_FACTOR,
      ip_hash,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json(inserted, { status: 201 })
}