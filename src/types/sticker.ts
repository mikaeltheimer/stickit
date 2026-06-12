export interface Sticker {
  id: string
  created_at: string
  author: string
  title: string | null
  message: string | null
  url: string | null
  tags: string[]
  image_url: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  bbox_factor: number
}

export interface TagReference {
  slug: string
  label_en: string
  label_fr: string
}

export type Locale = 'en' | 'fr'