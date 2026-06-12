import { createAdminClient } from '@/lib/supabase/server'
import Wall from '@/components/Wall'
import { Sticker, TagReference } from '@/types/sticker'

export const revalidate = 60 // revalide toutes les 60 secondes

async function getStickers(): Promise<Sticker[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('stickers')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return data ?? []
}

async function getTags(): Promise<TagReference[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tags_reference')
    .select('slug, label_en, label_fr')
    .order('sort_order')
  if (error) { console.error(error); return [] }
  return data ?? []
}

export default async function Home() {
  const [stickers, tags] = await Promise.all([getStickers(), getTags()])

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#0F0E0D',
      cursor: 'crosshair',
      userSelect: 'none',
    }}>
      <Wall
        initialStickers={stickers}
        tags={tags}
        locale="en"
      />
    </main>
  )
}