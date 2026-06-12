'use client'

import { Sticker, TagReference, Locale } from '@/types/sticker'

interface SidePanelProps {
  sticker: Sticker | null
  tags: TagReference[]
  locale: Locale
  activeTag: string | null
  onClose: () => void
  onTagFilter: (slug: string) => void
}

export default function SidePanel({ sticker, tags, locale, activeTag, onClose, onTagFilter }: SidePanelProps) {
  const isOpen = sticker !== null

  const getTagLabel = (slug: string) => {
    const tag = tags.find(t => t.slug === slug)
    if (!tag) return slug
    return locale === 'fr' ? tag.label_fr : tag.label_en
  }

  return (
    <div
      style={{
        position: 'fixed', top: 0, right: 0,
        height: '100%', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        width: '340px',
        background: '#161513',
        borderLeft: '2px solid rgba(255,45,120,0.65)',
        boxShadow: '-6px 0 40px rgba(255,45,120,0.18)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.38s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Stripe */}
      <div style={{ height: '3px', background: '#FF2D78', flexShrink: 0 }} />

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 10,
          width: 30, height: 30, background: '#1E1C1A',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: '50%',
          color: '#7A756E', fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#F0EDE8'}
        onMouseLeave={e => e.currentTarget.style.color = '#7A756E'}
      >
        ✕
      </button>

      {/* Image */}
      <div style={{
        width: '100%', aspectRatio: '1/1', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#1E1C1A', padding: 36, position: 'relative', overflow: 'hidden',
      }}>
        {sticker && (
          <img
            src={sticker.image_url}
            alt={sticker.title ?? `Sticker by ${sticker.author}`}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}
      </div>

      {/* Body */}
      <div style={{
        padding: '28px 24px 32px', overflowY: 'auto', flex: 1,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {sticker && (
          <>
            <div>
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 28, color: '#00FF9C', lineHeight: 1, letterSpacing: '0.03em',
                textShadow: '0 0 16px rgba(0,255,156,0.35)',
              }}>
                {sticker.author}
              </div>
              <div style={{
                fontSize: 11, color: '#7A756E', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginTop: 4,
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
                fontSize: 14, color: '#B0AA9F', lineHeight: 1.7,
                fontWeight: 300, fontStyle: 'italic',
              }}>
                {sticker.message}
              </div>
            )}

            {/* Tags — cliquables */}
            {sticker.tags.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.25)',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  {locale === 'fr' ? 'Étiquettes' : 'Tags'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {sticker.tags.map(slug => {
                    const isActive = activeTag === slug
                    return (
                      <button
                        key={slug}
                        onClick={() => onTagFilter(slug)}
                        style={{
                          fontSize: 10,
                          color: isActive ? '#0F0E0D' : '#E8FF47',
                          background: isActive ? '#E8FF47' : 'transparent',
                          border: `1px solid ${isActive ? '#E8FF47' : 'rgba(232,255,71,0.3)'}`,
                          borderRadius: 100,
                          padding: '4px 12px',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) e.currentTarget.style.background = 'rgba(232,255,71,0.1)'
                        }}
                        onMouseLeave={e => {
                          if (!isActive) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {getTagLabel(slug)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Active tag indicator */}
            {activeTag && !sticker.tags.includes(activeTag) && (
              <div style={{
                fontSize: 11, color: '#7A756E',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>
                  Filtering by <span style={{ color: '#E8FF47' }}>
                    {getTagLabel(activeTag)}
                  </span>
                </span>
                <button
                  onClick={() => onTagFilter(activeTag)}
                  style={{
                    background: 'none', border: 'none',
                    color: '#7A756E', cursor: 'pointer',
                    fontSize: 11, fontFamily: 'inherit',
                    padding: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F0EDE8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#7A756E'}
                >
                  clear ✕
                </button>
              </div>
            )}

            {sticker.url && (
              <div style={{
                marginTop: 'auto', paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.07)',
              }}>
                <a
                  href={sticker.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontSize: 12, color: '#7A756E', textDecoration: 'none',
                    letterSpacing: '0.04em',
                  }}
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