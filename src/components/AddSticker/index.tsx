'use client'

import { useState, useCallback } from 'react'
import { Sticker, TagReference } from '@/types/sticker'
import Modal from './Modal'
import AddButton from './AddButton'
import Step1Upload from './Step1Upload'
import Step2Detour from './Step2Detour'
import Step3Infos from './Step3Infos'
import Step5Confirm from './Step5Confirm'
import { StickerInfos } from './Step3Infos'

type ModalStep = 1 | 2 | 3 | 5

interface PlacementState {
  x: number; y: number; width: number; height: number; rotation: number
}

export interface PlacementModeData {
  imageUrl: string
  stickers: Sticker[]
  onConfirm: (p: PlacementState) => void
  onCancel: () => void
}

interface AddStickerProps {
  stickers: Sticker[]
  tags: TagReference[]
  onStickerAdded: (sticker: Sticker) => void
  onEnterPlacement: (data: PlacementModeData) => void
  onExitPlacement: () => void
}

const STEP_TITLES: Record<ModalStep, string> = {
  1: 'Upload your sticker',
  2: 'Remove background',
  3: 'About your sticker',
  5: 'Final check',
}

export default function AddSticker({
  stickers, tags, onStickerAdded, onEnterPlacement, onExitPlacement,
}: AddStickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<ModalStep>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [finalFile, setFinalFile] = useState<File | null>(null)
  const [finalUrl, setFinalUrl] = useState<string | null>(null)
  const [infos, setInfos] = useState<StickerInfos | null>(null)
  const [position, setPosition] = useState<PlacementState | null>(null)

  const reset = useCallback(() => {
    setStep(1)
    setFile(null)
    setPreviewUrl(null)
    setFinalFile(null)
    setFinalUrl(null)
    setInfos(null)
    setPosition(null)
    setError(null)
    setIsSubmitting(false)
    delete (window as any).__detourFile
  }, [])

  const handleClose = useCallback(() => {
    reset()
    setIsOpen(false)
    onExitPlacement()
  }, [reset, onExitPlacement])

  // ── Step handlers ──────────────────────────────────────────────────────────
  const handleStep1 = (f: File, url: string) => {
    setFile(f); setPreviewUrl(url); setFinalFile(f); setFinalUrl(url)
    setStep(2)
  }

  const handleStep2 = (url: string, f: File) => {
    setFinalUrl(url); setFinalFile(f)
    setStep(3)
  }

  const handleStep3 = (data: StickerInfos) => {
    setInfos(data)
    // Close modal, enter placement mode on canvas
    setIsOpen(false)
    onEnterPlacement({
      imageUrl: finalUrl!,
      stickers,
      onConfirm: (p) => {
        setPosition(p)
        setStep(5)
        setIsOpen(true)
      },
      onCancel: () => {
        onExitPlacement()
        setStep(3)
        setIsOpen(true)
      },
    })
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!finalFile || !finalUrl || !infos || !position) return
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', finalFile)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error ?? 'Upload failed')
      const { url: imageUrl } = await uploadRes.json()

      const stickerRes = await fetch('/api/stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: infos.author,
          title: infos.title,
          message: infos.message || null,
          url: infos.url || null,
          tags: infos.tags,
          image_url: imageUrl,
          x: position.x, y: position.y,
          width: position.width, height: position.height,
          rotation: position.rotation,
        }),
      })

      if (!stickerRes.ok) throw new Error((await stickerRes.json()).error ?? 'Failed to save sticker')

      const newSticker: Sticker = await stickerRes.json()
      onStickerAdded(newSticker)
      onExitPlacement()
      handleClose()

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AddButton onClick={() => { reset(); setIsOpen(true) }} />

      {isOpen && (
        <Modal
          title={STEP_TITLES[step]}
          step={step === 5 ? 4 : step}
          totalSteps={4}
          onClose={isSubmitting ? undefined : handleClose}
        >
          {error && (
            <div style={{
              fontSize: 12, color: '#FF2D78',
              background: 'rgba(255,45,120,0.08)',
              border: '1px solid rgba(255,45,120,0.2)',
              borderRadius: 8, padding: '10px 14px',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {step === 1 && <Step1Upload onNext={handleStep1} />}

          {step === 2 && file && previewUrl && (
            <Step2Detour
              file={file} previewUrl={previewUrl}
              onNext={handleStep2} onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3Infos
              tags={tags}
              onNext={handleStep3}
              onBack={() => setStep(2)}
            />
          )}

          {step === 5 && finalUrl && infos && position && (
            <Step5Confirm
              imageUrl={finalUrl} infos={infos}
              tags={tags} position={position}
              isSubmitting={isSubmitting}
              onConfirm={handleSubmit}
              onBack={() => {
                setIsOpen(false)
                onEnterPlacement({
                  imageUrl: finalUrl!,
                  stickers,
                  onConfirm: (p) => {
                    setPosition(p)
                    setStep(5)
                    setIsOpen(true)
                  },
                  onCancel: () => {
                    onExitPlacement()
                    setStep(3)
                    setIsOpen(true)
                  },
                })
              }}
            />
          )}
        </Modal>
      )}
    </>
  )
}