import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  photos: string[]
}

export function PhotoGallerySection({ photos }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.06 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const openLightbox = (i: number) => setLightbox(i)
  const closeLightbox = useCallback(() => setLightbox(null), [])
  const prev = useCallback(() => setLightbox(i => i !== null ? (i - 1 + photos.length) % photos.length : null), [photos.length])
  const next = useCallback(() => setLightbox(i => i !== null ? (i + 1) % photos.length : null), [photos.length])

  useEffect(() => {
    if (lightbox === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, closeLightbox, prev, next])

  if (!photos.length) return null

  return (
    <div
      ref={sectionRef}
      className={clsx(
        'w-full max-w-lg mx-auto px-5 pb-20 transition-all duration-1000',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      )}
    >
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
          Khoảnh Khắc
        </h2>
        <p
          className="mt-1.5 text-xs tracking-[0.2em] uppercase text-[#94a3b8]"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Những kỷ niệm đẹp trên hành trình
        </p>
      </div>

      {/* Masonry-style grid */}
      <div className="columns-2 gap-3 space-y-3">
        {photos.map((url, i) => (
          <PhotoTile
            key={url + i}
            url={url}
            index={i}
            onClick={() => openLightbox(i)}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={closeLightbox}
        >
          {/* Prev */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Image */}
          <img
            src={photos[lightbox]}
            alt={`Ảnh ${lightbox + 1}`}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl select-none"
            onClick={e => e.stopPropagation()}
          />

          {/* Next */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={24} />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Counter */}
          <span
            className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-white/50 tracking-widest"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {lightbox + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  )
}

function PhotoTile({ url, index, onClick }: { url: string; index: number; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={clsx(
        'relative break-inside-avoid cursor-pointer overflow-hidden rounded-2xl',
        'border border-[#fcd34d]/10 group transition-all duration-700',
        'hover:border-[#fcd34d]/30 hover:shadow-[0_8px_32px_rgba(252,211,77,0.15)]',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
      style={{ transitionDelay: `${Math.min(index * 80, 500)}ms` }}
    >
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" style={{ aspectRatio: '1' }} />
      )}
      <img
        src={url}
        alt={`Ảnh ${index + 1}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={clsx(
          'w-full h-auto object-cover transition-all duration-500',
          'group-hover:scale-[1.03]',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}

