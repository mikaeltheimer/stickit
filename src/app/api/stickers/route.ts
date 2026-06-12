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

  // ── Validation collision ─────────────────────────────────────────────────
  if (existing && existing.length > 0) {
    // 1. Ne doit pas recouvrir un sticker existant
    for (const s of existing) {
      if (overlaps(candidateBbox, effectiveBbox(s))) {
        return NextResponse.json({ error: 'Position overlaps existing sticker' }, { status: 409 })
      }
    }

    // 2. Doit toucher au moins un sticker existant
    const touchesOne = existing.some(s => touches(candidate, s))
    if (!touchesOne) {
      return NextResponse.json({ error: 'Sticker must touch at least one existing sticker' }, { status: 409 })
    }

    // 3. Contrainte centroïde — forme organique
    const centroidX = existing.reduce((sum, s) => sum + s.x, 0) / existing.length
    const centroidY = existing.reduce((sum, s) => sum + s.y, 0) / existing.length
    const distToCentroid = Math.hypot(body.x - centroidX, body.y - centroidY)
    if (distToCentroid > MAX_CENTROID_DISTANCE) {
      return NextResponse.json({ error: 'Position too far from the cluster' }, { status: 409 })
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