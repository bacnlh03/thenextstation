import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Navigation, X, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import {
  getDirectionsUrl,
  getMapEmbedUrl,
  getOpenMapUrl,
  type MapLocation,
} from '@/lib/map'

interface Props extends Pick<MapLocation, 'lat' | 'lng' | 'query' | 'label'> {
  onClose: () => void
}

export function MapModal({ lat, lng, query, label, onClose }: Props) {
  const location = { lat, lng, query, label: label || '' }
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsVisible(true)
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const title = label || query || `${lat}, ${lng}`

  if (!mounted) return null

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#07061a]/75 backdrop-blur-xl transition-opacity duration-300" />

      {/* Modal Container */}
      <div
        className={clsx(
          'relative w-full max-w-lg rounded-[1.75rem] overflow-hidden transition-all duration-300 transform',
          'bg-[#14122c] border border-[#fcd34d]/25 shadow-[0_30px_80px_rgba(0,0,0,0.55)]',
          isVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#fcd34d]/70 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 p-2.5 rounded-full text-[#fcd34d]/70 hover:text-[#fef3c7] hover:bg-[#fcd34d]/10 transition-all"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        <div className="p-7 sm:p-8">
          <div className="mb-6 pr-10">
            <div className="flex items-center gap-2 text-[#fcd34d] mb-2">
              <MapPin size={16} />
              <span className="text-[11px] font-semibold tracking-[0.22em] uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>Địa điểm</span>
            </div>
            <h3 className="text-xl sm:text-2xl text-[#fef3c7] leading-normal" style={{ fontFamily: "'Playfair Display', serif" }}>
              {title}
            </h3>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-[#fcd34d]/20 bg-[#0c0a1d]">
            <iframe
              title="Bản đồ địa điểm"
              src={getMapEmbedUrl(location)}
              className="w-full h-[250px] sm:h-[300px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <a
              href={getDirectionsUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-[#1e1b4b] bg-[#fcd34d] hover:bg-[#fde68a] shadow-[0_0_24px_rgba(252,211,77,0.28)] transition-all active:scale-95"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <Navigation size={18} />
              Chỉ đường
            </a>
            <a
              href={getOpenMapUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-[#fef3c7] border border-[#fcd34d]/35 hover:bg-[#fcd34d]/10 transition-all active:scale-95"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <ExternalLink size={18} />
              Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
