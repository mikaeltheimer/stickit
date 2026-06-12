'use client'

import { TagReference } from '@/types/sticker'
import { StickerInfos } from './Step3Infos'

interface Step5ConfirmProps {
  imageUrl: string
  infos: StickerInfos
  tags: TagReference[]
  position: { x: number; y: number; width: number; height: number; rotation: number }
  isSubmitting: boolean
  onConfirm: () => void
  onBack: () => void
}

export default function Step5Confirm({
  imageUrl, infos, tags, isSubmitting, onConfirm, onBack
}: Step5ConfirmProps) {

  const getTagLabel = (slug: string) => {
    const tag = tags.find(t => t.slug === slug)
    return tag?.label_en ?? slug
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Split preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Left — sticker on wall */}
        <div style={{
          background: '#0F0E0D',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 180,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Grain */}
          <svg style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            opacity: 0.4, mixBlendMode: 'overlay' as const,
          }}>
            <filter id="cnoise">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
              <feColorMatrix type="saturate" values="0"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#cnoise)"/>
          </svg>

          <div style={{
            transform: `rotate(${Math.random() * 10 - 5}deg)`,
            position: 'relative', zIndex: 1,
          }}>
            <img
              src={imageUrl}
              alt={infos.title}
              style={{
                maxWidth: 120, maxHeight: 120,
                objectFit: 'contain', display: 'block',
                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))',
              }}
            />
          </div>

          <div style={{
            position: 'absolute', bottom: 8, left: 0, right: 0,
            textAlign: 'center', fontSize: 9,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            On the wall
          </div>
        </div>

        {/* Right — side panel preview */}
        <div style={{
          background: '#161513',
          borderRadius: 12,
          border: '1px solid rgba(255,45,120,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Pink stripe */}
          <div style={{ height: 2, background: '#FF2D78', flexShrink: 0 }} />

          <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 20, color: '#00FF9C', lineHeight: 1,
              textShadow: '0 0 12px rgba(0,255,156,0.3)',
            }}>
              {infos.author}
            </div>

            {infos.title && (
              <div style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 500 }}>
                {infos.title}
              </div>
            )}

            {infos.message && (
              <div style={{
                fontSize: 11, color: '#B0AA9F',
                lineHeight: 1.6, fontStyle: 'italic', fontWeight: 300,
              }}>
                {infos.message}
              </div>
            )}

            {infos.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {infos.tags.map(slug => (
                  <span key={slug} style={{
                    fontSize: 9, color: '#E8FF47',
                    border: '1px solid rgba(232,255,71,0.3)',
                    borderRadius: 100, padding: '2px 8px',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    {getTagLabel(slug)}
                  </span>
                ))}
              </div>
            )}

            {infos.url && (
              <div style={{
                fontSize: 10, color: '#7A756E',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                paddingTop: 8, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                ↗ {infos.url.replace(/^https?:\/\//, '')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permanent warning */}
      <div style={{
        background: 'rgba(255,45,120,0.06)',
        border: '1px solid rgba(255,45,120,0.2)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{
            fontSize: 12, color: '#FF2D78', fontWeight: 500,
            letterSpacing: '0.04em', marginBottom: 3,
          }}>
            This is permanent
          </div>
          <div style={{
            fontSize: 11, color: '#7A756E', lineHeight: 1.6,
          }}>
            Once you stick it, it stays on the wall forever.
            Your sticker, name, and message cannot be edited or removed.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <GhostButton onClick={onBack} disabled={isSubmitting}>
          ← Back
        </GhostButton>
        <Stickit onClick={onConfirm} loading={isSubmitting} />
      </div>
    </div>
  )
}

// ── Stick it button ───────────────────────────────────────────────────────────
function Stickit({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={loading ? undefined : onClick}
      style={{
        flex: 1,
        background: loading ? 'rgba(232,255,71,0.4)' : '#E8FF47',
        color: '#0F0E0D',
        border: 'none', borderRadius: 100,
        padding: '12px 20px', fontSize: 14,
        fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        letterSpacing: '0.1em',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#f0ff6a' }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#E8FF47' }}
    >
      {loading ? (
        <>
          <span style={{
            width: 14, height: 14, borderRadius: '50%',
            border: '2px solid rgba(15,14,13,0.3)',
            borderTopColor: '#0F0E0D',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }} />
          Sticking…
        </>
      ) : (
        '🩹 Stick it!'
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  )
}

function GhostButton({ onClick, children, disabled }: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        background: 'none', border: 'none',
        color: disabled ? 'rgba(255,255,255,0.2)' : '#7A756E',
        borderRadius: 100, padding: '10px 20px', fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.04em', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = '#F0EDE8' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.color = '#7A756E' }}
    >
      {children}
    </button>
  )
}