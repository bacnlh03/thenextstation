import { useState, useEffect, useMemo, useRef } from 'react'
import { Camera, X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { normalizeMomentPhoto } from '@/types/design'
import type { PhotoItem } from '@/types/design'
import type { InvitationLanguage } from '@/lib/invitationLanguage'

interface Props {
  photos: PhotoItem[]
  layout?: 'collage' | 'grid'
  language?: InvitationLanguage
}

export function PhotoGallerySection({ photos, layout = 'collage', language = 'vi' }: Props) {
  const isEnglish = language === 'en'
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 })
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null)
  const swipeRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null)
  const lightboxPointersRef = useRef(new Map<number, { x: number; y: number }>())
  const lightboxPinchRef = useRef<{ distance: number; zoom: number } | null>(null)
  const lightboxImageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(400)

  const normalized = useMemo(
    () => (photos || []).map((p, i) => normalizeMomentPhoto(p, i, photos.length)),
    [photos],
  )

  // A photo can be moved/resized beyond the original 400px editor canvas.
  // Include the actual right edge of every photo so the whole design is
  // scaled into the mobile viewport instead of letting its right side overflow.
  const designWidth = normalized.reduce(
    (max, photo) => Math.max(max, photo.x + photo.width + 24),
    400
  )
  const scale = Math.min(1, containerWidth / designWidth)

  // Keep the 400px design canvas, but scale and center it inside the actual
  // gallery width so the collage never shifts outside a narrow viewport.
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const clientW = containerRef.current.clientWidth
        setContainerWidth(clientW)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Reserve room for the rotated cards and their shadows before images load.
  const maxY = normalized.reduce((acc, p) => {
    const cardHeight = Math.max(p.height || 0, p.width / (p.aspectRatio || 0.8) + 40)
    const angle = p.rotation * Math.PI / 180
    const rotatedHeight = Math.abs(Math.sin(angle)) * p.width + Math.abs(Math.cos(angle)) * cardHeight
    return Math.max(acc, p.y + (cardHeight + rotatedHeight) / 2)
  }, 420) + 40

  const activeLightboxUrl = activeLightboxIndex === null
    ? null
    : (() => {
        const photo = normalized[activeLightboxIndex]
        return photo ? photo.originalUrl || photo.url : null
      })()

  const openLightbox = (index: number) => {
    setActiveLightboxIndex(index)
    setLightboxZoom(1)
    setLightboxOffset({ x: 0, y: 0 })
  }

  const closeLightbox = () => {
    setActiveLightboxIndex(null)
    setLightboxZoom(1)
    setLightboxOffset({ x: 0, y: 0 })
  }

  const changeLightboxPhoto = (direction: -1 | 1) => {
    if (activeLightboxIndex === null || normalized.length < 2) return
    setActiveLightboxIndex((activeLightboxIndex + direction + normalized.length) % normalized.length)
    setLightboxZoom(1)
    setLightboxOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (activeLightboxIndex === null) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') changeLightboxPhoto(-1)
      if (event.key === 'ArrowRight') changeLightboxPhoto(1)
      if (event.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeLightboxIndex, normalized.length])

  if (!photos || !photos.length) return null

  const changeLightboxZoom = (amount: number) => {
    setLightboxZoom(value => {
      const next = Math.min(4, Math.max(1, Number((value + amount).toFixed(2))))
      setLightboxOffset(current => next === 1 ? { x: 0, y: 0 } : clampLightboxOffset(current, next))
      return next
    })
  }

  const clampLightboxOffset = (offset: { x: number; y: number }, zoom: number) => {
    const image = lightboxImageRef.current
    if (!image) return offset

    const viewportWidth = Math.max(0, window.innerWidth - 32)
    const viewportHeight = Math.min(window.innerHeight * 0.85, window.innerHeight - 32)
    const maxX = Math.max(0, (image.offsetWidth * zoom - viewportWidth) / 2)
    const maxY = Math.max(0, (image.offsetHeight * zoom - viewportHeight) / 2)

    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-20 select-none">
      {/* Section header */}
      <div className="flex flex-col items-center mb-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#fcd34d]/50" />
          <Camera size={18} className="text-[#fcd34d]" />
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#fcd34d]/50" />
        </div>
        <h2
          className="text-2xl font-semibold tracking-wide text-[#fef3c7]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          {isEnglish ? 'Memories' : 'Khoảnh Khắc'}
        </h2>
        <p
          className="mt-1.5 text-xs tracking-[0.2em] uppercase text-[#94a3b8]"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          {isEnglish ? 'Beautiful memories from the journey' : 'Những kỷ niệm đẹp trên hành trình'}
        </p>
      </div>

      {layout === 'grid' ? (
        /* Masonry-style grid */
        <div className="columns-2 gap-3 space-y-3">
          {normalized.map((photo, i) => (
            <PhotoTile
              key={photo.id || photo.url + i}
              url={photo.url}
              thumbnailUrl={photo.thumbnailUrl}
              aspectRatio={photo.aspectRatio || 0.8}
              index={i}
              onClick={() => openLightbox(i)}
            />
          ))}
        </div>
      ) : (
        /* Scrapbook / Collage layout with rotation, overlaps & custom positions */
        <div ref={containerRef} className="w-full flex justify-center overflow-visible">
          <div
            className="relative max-w-full overflow-hidden"
            style={{
              width: `${Math.min(designWidth, containerWidth)}px`,
              height: maxY * scale,
              overflow: 'clip',
              overflowClipMargin: '24px',
            }}
          >
            <div
              className="absolute left-1/2 top-0"
              style={{
                width: designWidth,
                height: maxY,
                transform: `translateX(-50%) scale(${scale})`,
                transformOrigin: 'top center',
              }}
            >
              {normalized.map((photo, i) => (
                <CollagePhotoCard
                  key={photo.id || photo.url + i}
                  photo={photo}
                  index={i}
                  onClick={() => openLightbox(i)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox zoom modal */}
      {activeLightboxUrl && (
        <div
          onClick={closeLightbox}
          onWheel={event => changeLightboxZoom(event.deltaY < 0 ? 0.2 : -0.2)}
          className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4 overflow-hidden overscroll-contain"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-5 right-5 p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors z-10"
            title={isEnglish ? 'Close' : 'Đóng'}
          >
            <X size={20} />
          </button>
          {normalized.length > 1 && (
            <>
              <button
                type="button"
                aria-label={isEnglish ? 'Previous photo' : 'Ảnh trước'}
                onClick={event => { event.stopPropagation(); changeLightboxPhoto(-1) }}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                aria-label={isEnglish ? 'Next photo' : 'Ảnh tiếp theo'}
                onClick={event => { event.stopPropagation(); changeLightboxPhoto(1) }}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                {(activeLightboxIndex ?? 0) + 1} / {normalized.length}
              </div>
            </>
          )}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full bg-black/60 p-1 text-white backdrop-blur-md">
            <button
              type="button"
              onClick={event => { event.stopPropagation(); changeLightboxZoom(-0.25) }}
              className="rounded-full p-2 hover:bg-white/20 disabled:opacity-40"
              disabled={lightboxZoom <= 1}
              title={isEnglish ? 'Zoom out' : 'Thu nhỏ'}
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              onClick={event => { event.stopPropagation(); changeLightboxZoom(0.25) }}
              className="rounded-full p-2 hover:bg-white/20 disabled:opacity-40"
              disabled={lightboxZoom >= 4}
              title={isEnglish ? 'Zoom in' : 'Phóng to'}
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                setLightboxZoom(1)
                setLightboxOffset({ x: 0, y: 0 })
              }}
              className="rounded-full p-2 hover:bg-white/20 disabled:opacity-40"
              disabled={lightboxZoom === 1 && lightboxOffset.x === 0 && lightboxOffset.y === 0}
              title={isEnglish ? 'Reset zoom' : 'Đặt lại zoom'}
            >
              <RotateCcw size={18} />
            </button>
          </div>
          <img
            ref={lightboxImageRef}
            src={activeLightboxUrl}
            alt="Phóng to ảnh"
            fetchPriority="high"
            decoding="async"
            onClick={event => event.stopPropagation()}
            onPointerDown={event => {
              event.stopPropagation()
              lightboxPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
              if (lightboxPointersRef.current.size === 2) {
                const [first, second] = Array.from(lightboxPointersRef.current.values())
                lightboxPinchRef.current = {
                  distance: Math.hypot(second.x - first.x, second.y - first.y),
                  zoom: lightboxZoom,
                }
                swipeRef.current = null
                panRef.current = null
                event.currentTarget.setPointerCapture(event.pointerId)
                return
              }
              swipeRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
              }
              if (lightboxZoom <= 1) return
              panRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                originX: lightboxOffset.x,
                originY: lightboxOffset.y,
              }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={event => {
              const pointer = lightboxPointersRef.current
              if (pointer.has(event.pointerId)) {
                pointer.set(event.pointerId, { x: event.clientX, y: event.clientY })
              }

              const pinch = lightboxPinchRef.current
              if (pinch && pointer.size === 2) {
                event.preventDefault()
                const [first, second] = Array.from(pointer.values())
                const distance = Math.hypot(second.x - first.x, second.y - first.y)
                const nextZoom = Math.min(4, Math.max(1, Number((pinch.zoom * distance / pinch.distance).toFixed(2))))
                setLightboxZoom(nextZoom)
                setLightboxOffset(current => nextZoom === 1 ? { x: 0, y: 0 } : clampLightboxOffset(current, nextZoom))
                return
              }

              const pan = panRef.current
              if (!pan || pan.pointerId !== event.pointerId) return
              setLightboxOffset(clampLightboxOffset({
                x: pan.originX + event.clientX - pan.startX,
                y: pan.originY + event.clientY - pan.startY,
              }, lightboxZoom))
            }}
            onPointerUp={event => {
              const wasPinching = lightboxPinchRef.current !== null
              lightboxPointersRef.current.delete(event.pointerId)
              if (lightboxPointersRef.current.size < 2) lightboxPinchRef.current = null
              if (wasPinching) {
                swipeRef.current = null
                panRef.current = null
                return
              }
              if (panRef.current?.pointerId === event.pointerId) panRef.current = null
              const swipe = swipeRef.current
              if (swipe?.pointerId === event.pointerId) {
                const deltaX = event.clientX - swipe.startX
                const deltaY = event.clientY - swipe.startY
                swipeRef.current = null
                if (lightboxZoom <= 1 && Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
                  changeLightboxPhoto(deltaX < 0 ? 1 : -1)
                }
              }
            }}
            onPointerCancel={() => {
              lightboxPointersRef.current.clear()
              lightboxPinchRef.current = null
              panRef.current = null
              swipeRef.current = null
            }}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxZoom})`,
              touchAction: 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}

function CollagePhotoCard({
  photo,
  index,
  onClick,
}: {
  photo: ReturnType<typeof normalizeMomentPhoto>
  index: number
  onClick: () => void
}) {
  const isPolaroid = photo.frame === 'polaroid'
  const isGold = photo.frame === 'gold'
  const isLandscape = photo.orientation === 'landscape'

  return (
    <div
      onClick={onClick}
      className={clsx(
        'absolute transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer group',
        isPolaroid &&
          'bg-[#fffefb] p-2 pb-5 rounded-xs shadow-[0_12px_28px_rgba(0,0,0,0.55)] ring-1 ring-black/10',
        isGold &&
          'p-1.5 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-[0_12px_28px_rgba(0,0,0,0.55)]',
        !isPolaroid &&
          !isGold &&
          'rounded-xl overflow-hidden shadow-[0_12px_28px_rgba(0,0,0,0.55)] border border-white/10'
      )}
      style={{
        left: photo.x,
        top: photo.y,
        width: photo.width,
        transform: `rotate(${photo.rotation}deg)`,
        zIndex: photo.zIndex || index + 1,
      }}
    >
      <div
        className={clsx(
          'relative w-full overflow-hidden bg-slate-800/40',
          isPolaroid ? 'rounded-[1px]' : 'rounded-lg'
        )}
        style={{ aspectRatio: photo.aspectRatio || (isLandscape ? 1.25 : 0.8) }}
      >
        <img
          src={photo.thumbnailUrl || photo.url}
          data-full-src={photo.url}
          alt={`Khoảnh khắc ${index + 1}`}
          // Collage cards are absolutely positioned inside a scaled canvas;
          // lazy loading can incorrectly consider some of them off-screen.
          loading="lazy"
          fetchPriority={index < 2 ? 'high' : 'auto'}
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {isPolaroid && (
        <div className="flex items-center justify-between mt-1 px-0.5">
          <span className="text-[8px] text-amber-700/60 font-serif tracking-widest">✦ ✦</span>
          <span className="text-[8px] text-slate-400/80 font-mono">#{index + 1}</span>
        </div>
      )}
    </div>
  )
}

function PhotoTile({
  url,
  thumbnailUrl,
  aspectRatio,
  index,
  onClick,
}: {
  url: string
  thumbnailUrl?: string
  aspectRatio: number
  index: number
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative break-inside-avoid overflow-hidden rounded-2xl select-none cursor-pointer',
        'border border-[#fcd34d]/10 transition-transform duration-300 hover:scale-[1.02]'
      )}
      style={{ aspectRatio }}
    >
      <img
        src={thumbnailUrl || url}
        data-full-src={url}
        alt={`Ảnh ${index + 1}`}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain pointer-events-none"
      />
    </div>
  )
}
