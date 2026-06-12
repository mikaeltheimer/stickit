'use client'

import { useState } from 'react'
import { TagReference } from '@/types/sticker'

interface Step3InfosProps {
  tags: TagReference[]
  onNext: (infos: StickerInfos) => void
  onBack: () => void
}

export interface StickerInfos {
  author: string
  title: string
  message: string
  url: string
  tags: string[]
}

export default function Step3Infos({ tags, onNext, onBack }: Step3InfosProps) {
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [errors, setErrors] = useState<Partial<StickerInfos>>({})

  const toggleTag = (slug: string) => {
    setSelectedTags(prev =>
      prev.includes(slug)
        ? prev.filter(t => t !== slug)
        : prev.length < 3 ? [...prev, slug] : prev
    )
  }

  const validate = () => {
    const e: Partial<StickerInfos> = {}
    if (!author.trim()) e.author = 'Required'
    if (!title.trim()) e.title = 'Required'
    if (url && !/^https?:\/\/.+/.test(url)) e.url = 'Must start with http:// or https://'
    return e
  }

  const handleNext = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onNext({ author: author.trim(), title: title.trim(), message: message.trim(), url: url.trim(), tags: selectedTags })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      <Field label="Your name" required error={errors.author}>
        <Input
          value={author}
          onChange={v => { setAuthor(v); setErrors(p => ({ ...p, author: undefined })) }}
          placeholder="How you want to be known"
          maxLength={80}
        />
      </Field>

      <Field label="Title" required error={errors.title}>
        <Input
          value={title}
          onChange={v => { setTitle(v); setErrors(p => ({ ...p, title: undefined })) }}
          placeholder="Give your sticker a title"
          maxLength={80}
        />
      </Field>

      <Field label="Message" error={errors.message}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="A few words… (optional)"
          maxLength={200}
          rows={3}
          style={{
            ...inputStyle,
            resize: 'none',
            lineHeight: 1.6,
          }}
        />
        <div style={{
          fontSize: 10, color: message.length > 180 ? '#FF2D78' : 'rgba(255,255,255,0.2)',
          textAlign: 'right', marginTop: 4, letterSpacing: '0.06em',
        }}>
          {message.length}/200
        </div>
      </Field>

      <Field label="URL" error={errors.url}>
        <Input
          value={url}
          onChange={v => { setUrl(v); setErrors(p => ({ ...p, url: undefined })) }}
          placeholder="https://yoursite.com (optional)"
          maxLength={200}
        />
      </Field>

      <Field label={`Tags — ${selectedTags.length}/3`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {[...tags].sort((a, b) => a.label_en.localeCompare(b.label_en)).map(tag => {
            const selected = selectedTags.includes(tag.slug)
            const maxed = selectedTags.length >= 3 && !selected
            return (
              <button
                key={tag.slug}
                onClick={() => !maxed && toggleTag(tag.slug)}
                style={{
                  fontSize: 11,
                  padding: '5px 12px',
                  borderRadius: 100,
                  border: `1px solid ${selected ? 'rgba(232,255,71,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  background: selected ? 'rgba(232,255,71,0.1)' : 'transparent',
                  color: selected ? '#E8FF47' : maxed ? 'rgba(255,255,255,0.2)' : '#7A756E',
                  cursor: maxed ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {tag.label_en}
              </button>
            )
          })}
        </div>
      </Field>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={handleNext} style={{ flex: 1 }}>
          Choose placement →
        </PrimaryButton>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  color: '#F0EDE8',
  fontFamily: 'inherit',
  outline: 'none',
}

function Input({ value, onChange, placeholder, maxLength }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLength?: number
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={inputStyle}
      onFocus={e => e.currentTarget.style.borderColor = 'rgba(232,255,71,0.4)'}
      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
    />
  )
}

function Field({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 11, color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
      }}>
        {label}
        {required && <span style={{ color: '#FF2D78', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: '#FF2D78', letterSpacing: '0.04em' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function PrimaryButton({ onClick, children, style }: {
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#E8FF47', color: '#0F0E0D',
        border: 'none', borderRadius: 100,
        padding: '10px 20px', fontSize: 13,
        fontWeight: 500, cursor: 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.04em',
        transition: 'all 0.15s',
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f0ff6a'}
      onMouseLeave={e => e.currentTarget.style.background = '#E8FF47'}
    >
      {children}
    </button>
  )
}

function GhostButton({ onClick, children }: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none',
        color: '#7A756E', borderRadius: 100,
        padding: '10px 20px', fontSize: 13,
        cursor: 'pointer', fontFamily: 'inherit',
        letterSpacing: '0.04em', transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#F0EDE8'}
      onMouseLeave={e => e.currentTarget.style.color = '#7A756E'}
    >
      {children}
    </button>
  )
}