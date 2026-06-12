'use client'

import { useRef, useState } from 'react'

interface Step1UploadProps {
  onNext: (file: File, previewUrl: string) => void
}

export default function Step1Upload({ onNext }: Step1UploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
  const MAX_SIZE = 2 * 1024 * 1024 // 2MB

  const processFile = (file: File) => {
    setError(null)
    if (!ACCEPTED.includes(file.type)) {
      setError('Accepted formats: PNG, JPG, WEBP')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Max file size: 2MB')
      return
    }
    const url = URL.createObjectURL(file)
    onNext(file, url)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${isDragOver ? 'rgba(232,255,71,0.7)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 12,
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          cursor: 'pointer',
          background: isDragOver ? 'rgba(232,255,71,0.04)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontSize: 36 }}>🖼️</div>
        <div style={{
          fontSize: 14, color: '#F0EDE8', fontWeight: 500, textAlign: 'center',
        }}>
          Drop your image here
        </div>
        <div style={{
          fontSize: 12, color: '#7A756E', textAlign: 'center', lineHeight: 1.5,
        }}>
          or click to browse<br />
          <span style={{ fontSize: 11 }}>PNG, JPG, WEBP · max 2MB</span>
        </div>
      </div>

      {error && (
        <div style={{
          fontSize: 12, color: '#FF2D78',
          background: 'rgba(255,45,120,0.08)',
          border: '1px solid rgba(255,45,120,0.2)',
          borderRadius: 8, padding: '10px 14px',
          letterSpacing: '0.02em',
        }}>
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />

      <p style={{
        fontSize: 11, color: 'rgba(255,255,255,0.2)',
        textAlign: 'center', lineHeight: 1.6,
        letterSpacing: '0.04em',
      }}>
        Your sticker will be permanently added to the wall.<br />
        Make sure you have the rights to use this image.
      </p>
    </div>
  )
}