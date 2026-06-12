'use client'

import { useState, useRef, useEffect } from 'react'
import { TagReference, Sticker, Locale } from '@/types/sticker'

interface TagFilterProps {
  tags: TagReference[]
  stickers: Sticker[]
  activeTag: string | null
  locale: Locale
  onTagFilter: (slug: string | null) => void
}

export default function TagFilter({ tags, stickers, activeTag, locale, onTagFilter }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Tags effectivement utilisés
  const usedTags = new Set(stickers.flatMap(s => s.tags))

  // Fermer si clic extérieur
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const sortedTags = [...tags].sort((a, b) =>
    (locale === 'fr' ? a.label_fr : a.label_en)
      .localeCompare(locale === 'fr' ? b.label_fr : b.label_en)
  )

  const activeTagLabel = activeTag
    ? (tags.find(t => t.slug === activeTag)?.[locale === 'fr' ? 'label_fr' : 'label_en'] ?? activeTag)
    : null

  return (
    <div
      ref={ref}
      id="tag-filter"
      style={{
        position: 'fixed',
        top: 24, right: 28,
        zIndex: 200,
      }}
    >
      {/* Trigger pill */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: isOpen || activeTag
            ? 'rgba(0,207,255,0.12)'
            : 'rgba(15,14,13,0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${isOpen || activeTag ? 'rgba(0,207,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 100,
          padding: '8px 16px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          boxShadow: isOpen || activeTag ? '0 0 16px rgba(0,207,255,0.15)' : 'none',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 3h10M3 6h6M5 9h2"
            stroke={isOpen || activeTag ? '#00CFFF' : 'rgba(255,255,255,0.4)'}
            strokeWidth="1.5" strokeLinecap="round"
          />
        </svg>
        <span style={{
          fontSize: 11,
          color: isOpen || activeTag ? '#00CFFF' : 'rgba(255,255,255,0.4)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          {activeTagLabel ?? (locale === 'fr' ? 'Filtrer' : 'Filter')}
        </span>
        {activeTag && (
          <span
            onClick={e => { e.stopPropagation(); onTagFilter(null) }}
            style={{
              fontSize: 11, color: '#00CFFF',
              cursor: 'pointer', lineHeight: 1,
              opacity: 0.7, marginLeft: 2,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >
            ✕
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 220,
          background: '#161513',
          border: '1px solid rgba(0,207,255,0.2)',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,207,255,0.08)',
          overflow: 'hidden',
          padding: '6px 0',
        }}>
          {/* Clear option */}
          {activeTag && (
            <>
              <button
                onClick={() => { onTagFilter(null); setIsOpen(false) }}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '8px 16px', textAlign: 'left',
                  fontSize: 11, color: '#FF2D78',
                  cursor: 'pointer', fontFamily: 'inherit',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,45,120,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: 13 }}>✕</span>
                {locale === 'fr' ? 'Effacer le filtre' : 'Clear filter'}
              </button>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            </>
          )}

          {/* Tag list */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {sortedTags.map(tag => {
              const used = usedTags.has(tag.slug)
              const isActive = activeTag === tag.slug
              const label = locale === 'fr' ? tag.label_fr : tag.label_en

              return (
                <button
                  key={tag.slug}
                  onClick={() => {
                    if (!used) return
                    onTagFilter(isActive ? null : tag.slug)
                    setIsOpen(false)
                  }}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '8px 16px', textAlign: 'left',
                    cursor: used ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (used) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isActive ? 'rgba(0,207,255,0.08)' : 'none'
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    color: isActive ? '#00CFFF' : used ? '#F0EDE8' : 'rgba(255,255,255,0.2)',
                    letterSpacing: '0.02em',
                    fontWeight: isActive ? 500 : 400,
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: isActive ? '#00CFFF' : 'rgba(255,255,255,0.2)',
                    letterSpacing: '0.06em',
                  }}>
                    {used
                      ? `${stickers.filter(s => s.tags.includes(tag.slug)).length}`
                      : '—'
                    }
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}