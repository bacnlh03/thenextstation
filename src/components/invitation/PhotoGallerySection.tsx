import { useState, useEffect, useRef } from 'react'
import { Camera } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  photos: string[]
}

export function PhotoGallerySection({ photos }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

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
          />
        ))}
      </div>
    </div>
  )
}

function PhotoTile({ url, index }: { url: string; index: number }) {
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
      className={clsx(
        'relative break-inside-avoid overflow-hidden rounded-2xl select-none',
        'border border-[#fcd34d]/10 transition-all duration-700',
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
          'w-full h-auto object-cover transition-opacity duration-500 pointer-events-none',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
