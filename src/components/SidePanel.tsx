'use client'

import { Sticker, TagReference, Locale } from '@/types/sticker'

interface SidePanelProps {
  sticker: Sticker | null
  tags: TagReference[]
  locale: Locale
  onClose: () => void
}

export default function SidePanel({ sticker, tags, locale, onClose }: SidePanelProps) {
  const isOpen = sticker !== null

  const getTagLabel = (slug: string) => {
    const tag = tags.find(t => t.slug === slug)
    if (!tag) return slug
    return locale === 'fr' ? tag.label_fr : tag.label_en
  }

  return (
    <div
      className="fixed top-0 right-0 h-full z-50 flex flex-col"
      style={{
        width: '340px',
        background: '#161513',
        borderLeft: '2px solid rgba(255,45,120,0.65)',
        boxShadow: '-6px 0 40px rgba(255,45,120,0.18)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.38s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Stripe colorée — couleur dominante injectée plus tard */}
      <div style={{ height: '3px', background: '#FF2D78', flexShrink: 0 }} />

      {/* Bouton fermer */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 flex items-center justify-center"
        style={{
          width: 30, height: 30,
          background: '#1E1C1A',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '50%',
          color: '#7A756E',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        ✕
      </button>

      {/* Image */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '100%',
          aspectRatio: '1/1',
          background: '#1E1C1A',
          padding: 36,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {sticker && (
          <img
            src={sticker.image_url}
            alt={sticker.title ?? `Sticker by ${sticker.author}`}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ padding: '28px 24px 32px', gap: 20 }}>
        {sticker && (
          <>
            <div>
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 28,
                color: '#00FF9C',
                lineHeight: 1,
                letterSpacing: '0.03em',
                textShadow: '0 0 16px rgba(0,255,156,0.35)',
              }}>
                {sticker.author}
              </div>
              <div style={{
                fontSize: 11,
                color: '#7A756E',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 4,
              }}>
                {new Date(sticker.created_at).toLocaleDateString(
                  locale === 'fr' ? 'fr-CA' : 'en-CA',
                  { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </div>
            </div>

            {sticker.title && (
              <div style={{ fontSize: 15, color: '#F0EDE8', fontWeight: 500 }}>
                {sticker.title}
              </div>
            )}

            {sticker.message && (
              <div style={{
                fontSize: 14,
                color: '#B0AA9F',
                lineHeight: 1.7,
                fontWeight: 300,
                fontStyle: 'italic',
              }}>
                {sticker.message}
              </div>
            )}

            {sticker.tags.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {sticker.tags.map(slug => (
                  <span key={slug} style={{
                    fontSize: 10,
                    color: '#E8FF47',
                    border: '1px solid rgba(232,255,71,0.3)',
                    borderRadius: 100,
                    padding: '3px 10px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    {getTagLabel(slug)}
                  </span>
                ))}
              </div>
            )}

            {sticker.url && (
              <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <a
                  href={sticker.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                  style={{ gap: 7, fontSize: 12, color: '#7A756E', textDecoration: 'none', letterSpacing: '0.04em' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#E8FF47')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#7A756E')}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {sticker.url.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}