import { useEffect, useState, useRef, type ReactNode } from 'react'
import confetti from 'canvas-confetti'
import { Volume2, VolumeX, ChevronDown } from 'lucide-react'
import { useGuestStore } from '@/stores/useGuestStore'
import { useDesignStore } from '@/stores/useDesignStore'
import { InvitationRenderer } from '@/components/InvitationRenderer'
import { WishesSection } from '@/components/invitation/WishesSection'
import { PhotoGallerySection } from '@/components/invitation/PhotoGallerySection'
import { useSearchParams, useParams } from 'react-router-dom'
import clsx from 'clsx'
import type { DesignConfig } from '@/types/design'
import type { Guest } from '@/types'

export function InvitationPage() {
  const [searchParams] = useSearchParams()
  const { slug } = useParams<{ slug?: string }>()
  const guestIdentifier = slug || searchParams.get('id') || searchParams.get('to')
  
  const getGuestById = useGuestStore(state => state.getGuestById)
  const confirmAttendance = useGuestStore(state => state.confirmAttendance)
  const { config, fetchConfig } = useDesignStore()
  
  const [guestId, setGuestId] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('Bạn của Ngọc Trâm')
  const [isConfirmed, setIsConfirmed] = useState<number>(0)
  const [allowWishes, setAllowWishes] = useState<boolean>(true)
  const [isVisible, setIsVisible] = useState(false)
  const [isOpened, setIsOpened] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  useEffect(() => {
    async function init() {
      await fetchConfig()
      if (guestIdentifier) {
        const guest = await getGuestById(guestIdentifier)
        if (guest) {
          setGuestId(guest.id)
          setGuestName(guest.full_name)
          setIsConfirmed(guest.status)
          if (typeof guest.allow_wishes === 'boolean') {
            setAllowWishes(guest.allow_wishes)
          }
        }
      }
      setTimeout(() => setIsVisible(true), 180)
    }
    init()
  }, [guestIdentifier, getGuestById, fetchConfig])

  useEffect(() => {
    if (config.music?.enabled && config.music.url && !audioRef.current) {
      audioRef.current = new Audio(config.music.url)
      audioRef.current.loop = false
    }
  }, [config.music])

  const startMusic = () => {
    if (config.music?.enabled && audioRef.current && !isPlaying) {
      const start = config.music.startTime || 0
      const end = config.music.endTime || 0

      audioRef.current.currentTime = start
      audioRef.current.play().catch(e => console.error("Auto-play failed", e))
      setIsPlaying(true)

      const handleTimeUpdate = () => {
        if (!audioRef.current) return
        if (end > 0 && audioRef.current.currentTime >= end) {
          if (audioRef.current.loop) {
            audioRef.current.currentTime = start
          } else {
            audioRef.current.pause()
            setIsPlaying(false)
          }
        }
      }

      audioRef.current.ontimeupdate = handleTimeUpdate
    }
  }

  const toggleMusic = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }
    audio.play().catch(e => console.error("Auto-play failed", e))
    setIsPlaying(true)
  }

  const [hasScrolled, setHasScrolled] = useState(false)

  const handleOpen = () => {
    setIsOpened(true)
    startMusic()
  }

  // Hide scroll hint once user actually scrolls
  useEffect(() => {
    if (!isOpened) return
    const onScroll = () => {
      if (window.scrollY > 60) setHasScrolled(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isOpened])

  const handleConfirm = async () => {
    if (isConfirmed === 2) return
    if (guestId) {
       await confirmAttendance(guestId)
    }
    setIsConfirmed(2)
    confetti({ 
      particleCount: 90, 
      spread: 70, 
      origin: { y: 0.62 }, 
      colors: ['#fef3c7', '#fcd34d', '#fbbf24', '#fffbeb'], 
      scalar: 0.75,
      gravity: 0.85
    })
  }

  const hasMusic = Boolean(config.music?.enabled && config.music.url)
  const hasPhotos = Boolean(config.photos && config.photos.length > 0)
  const hasSectionsBelow = Boolean(allowWishes || hasPhotos)

  return (
    <div 
      className="min-h-screen w-full relative overflow-x-hidden selection:bg-[#fcd34d]/30 selection:text-[#1e1b4b]"
      style={{
          background: 'radial-gradient(ellipse at 50% 0%, #2a2458 0%, #16132e 42%, #0b0918 100%)',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&family=Quicksand:wght@300;400;500;700&family=Charm:wght@400;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Oswald:wght@200;400;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:ital,wght@0,300;0,400;0,700;1,400&family=Saira+Stencil+One&display=swap');
        .font-luxury-serif { font-family: 'Playfair Display', serif; }
        .font-luxury-sans { font-family: 'Montserrat', sans-serif; }

        .night-stars {
          background-image:
            radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.75) 50%, transparent 52%),
            radial-gradient(1px 1px at 28% 72%, rgba(255,255,255,0.45) 50%, transparent 52%),
            radial-gradient(1.5px 1.5px at 72% 22%, rgba(252,211,77,0.85) 50%, transparent 52%),
            radial-gradient(1px 1px at 84% 64%, rgba(255,255,255,0.55) 50%, transparent 52%),
            radial-gradient(1px 1px at 46% 40%, rgba(255,255,255,0.35) 50%, transparent 52%),
            radial-gradient(1px 1px at 63% 84%, rgba(252,211,77,0.5) 50%, transparent 52%),
            radial-gradient(1px 1px at 8% 88%, rgba(255,255,255,0.4) 50%, transparent 52%);
        }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(22px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
            animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(7px); }
        }
        .animate-bounce-slow { animation: bounce-slow 1.6s ease-in-out infinite; }

        @keyframes reveal-down {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal { animation: reveal-down 0.9s cubic-bezier(0.16,1,0.3,1) forwards; }

        @keyframes shimmer-hint {
          0%   { opacity: 0.3; transform: translateY(0) scaleX(1); }
          50%  { opacity: 1;   transform: translateY(3px) scaleX(1.08); }
          100% { opacity: 0.3; transform: translateY(0) scaleX(1); }
        }
        .animate-shimmer-hint { animation: shimmer-hint 2s ease-in-out infinite; }
      `}</style>

      {/* Fixed background decorations */}
      <div className="night-stars fixed inset-0 pointer-events-none" />
      <div className="fixed top-[-18%] left-1/2 -translate-x-1/2 w-[70vw] h-[40vw] bg-[#fcd34d]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(6,5,16,0.72)_100%)]" />

      {/* ── SECTION 1: Invitation card (full viewport height, centered) ── */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 pt-4 pb-16 md:py-8">
        <div 
          className={clsx(
            "relative z-10 flex flex-col items-center -translate-y-2 md:translate-y-0",
            isVisible ? "animate-enter" : "opacity-0"
          )}
        >
          <InvitationWrapper 
            config={config} 
            guest={{ 
              id: guestId || 'demo', 
              full_name: guestName, 
              status: isConfirmed, 
              updated_at: '' 
            }} 
            isConfirmed={isConfirmed === 2}
            onConfirm={handleConfirm}
            onOpen={handleOpen}
          />
        </div>

        {/* Scroll hint — appears after card opens, hides when user scrolls past (only if there are sections below) */}
        {hasSectionsBelow && (
          <div className={clsx(
            'absolute bottom-3 md:bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 transition-all duration-1000 z-20 cursor-pointer',
            isOpened && !hasScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => {
            window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' })
          }}
          >
            <span
              className="text-[9px] tracking-[0.35em] uppercase text-[#fcd34d]/70 font-semibold"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Cuộn xuống
            </span>
            {/* Triple chevron cascade */}
            <div className="flex flex-col items-center -space-y-2">
              {[0, 1, 2].map(i => (
                <ChevronDown
                  key={i}
                  size={14}
                  className="text-[#fcd34d]"
                  style={{
                    opacity: 0.35 + i * 0.3,
                    animation: `bounce-slow 1.6s ease-in-out ${i * 0.18}s infinite`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Sections revealed only after opening the card ── */}
      {hasSectionsBelow && isOpened && (
        <div className="relative z-10 animate-fade-in">
          {/* SECTION 2: Wishes (only if guest has allowWishes turned on) */}
          {allowWishes && (
            <>
              {/* Soft divider */}
              <div className="flex items-center justify-center gap-4 px-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#fcd34d]/20 to-transparent" />
                <span className="text-[#fcd34d]/30 text-xs">✦</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#fcd34d]/20 to-transparent" />
              </div>

              <section>
                <WishesSection guestId={guestId} guestName={guestName} />
              </section>
            </>
          )}

          {/* SECTION 3: Photo gallery */}
          {hasPhotos && (
            <>
              {/* Soft divider */}
              <div className="flex items-center justify-center gap-4 px-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#fcd34d]/20 to-transparent" />
                <span className="text-[#fcd34d]/30 text-xs">✦</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#fcd34d]/20 to-transparent" />
              </div>

              <section>
                <PhotoGallerySection photos={config.photos!} />
              </section>
            </>
          )}
        </div>
      )}

      {/* Music toggle button */}
      {hasMusic && isOpened && (
        <button
          type="button"
          onClick={toggleMusic}
          aria-label={isPlaying ? 'Tắt nhạc' : 'Bật nhạc'}
          className="fixed bottom-5 right-5 z-50 h-11 w-11 rounded-full border border-[#fcd34d]/40 bg-[#14122c]/80 text-[#fcd34d] backdrop-blur-md flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:bg-[#fcd34d]/15 transition-colors"
        >
          {isPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      )}
    </div>
  )
}

function InvitationWrapper({ config, guest, isConfirmed, onConfirm, onOpen }: { 
    config: DesignConfig, 
    guest: Guest, 
    isConfirmed: boolean, 
    onConfirm: () => void,
    onOpen: () => void
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)

    useEffect(() => {
        const updateScale = () => {
            const frame = 28
            const isMobile = window.innerWidth < 768
            const horizontalMargin = isMobile ? 24 : 32
            const verticalMargin = isMobile ? 150 : 120
            const viewportWidth = window.innerWidth - horizontalMargin - frame
            const viewportHeight = window.innerHeight - verticalMargin - frame
            const scaleX = viewportWidth / config.width
            const scaleY = viewportHeight / config.height
            const targetScale = Math.min(scaleX, scaleY, 1)
            setScale(targetScale > 0 ? targetScale : 1)
        }
        updateScale()
        window.addEventListener('resize', updateScale)
        const timeout = setTimeout(updateScale, 100)
        return () => {
            window.removeEventListener('resize', updateScale)
            clearTimeout(timeout)
        }
    }, [config.width, config.height])

    const width = config.width * scale
    const height = config.height * scale

    return (
        <div ref={containerRef} className="flex justify-center items-center">
             <div
                className="relative p-px"
                style={{
                  width: width + 18,
                  height: height + 18,
                  background: 'linear-gradient(160deg, rgba(253,230,138,0.95), rgba(180,83,9,0.55) 38%, rgba(252,211,77,0.9) 68%, rgba(120,53,15,0.7))',
                  boxShadow: '0 28px 70px rgba(0,0,0,0.48), 0 0 48px rgba(252,211,77,0.14)',
                }}
             >
                <div className="absolute inset-[7px] border border-[#fcd34d]/25 pointer-events-none z-30" />
                <CornerMarks />
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ width, height }}
                >
                  <InvitationRenderer 
                      config={config} 
                      guest={guest} 
                      isConfirmed={isConfirmed}
                      onConfirm={onConfirm}
                      scale={scale}
                  />
                  <BookCoverReveal scale={scale} onOpen={onOpen} />
                </div>
             </div>
        </div>
    )
}

function CornerMarks() {
  const mark = "absolute w-3.5 h-3.5 border-[#fef3c7]/80 z-30 pointer-events-none"
  return (
    <>
      <span className={clsx(mark, "top-1.5 left-1.5 border-t border-l")} />
      <span className={clsx(mark, "top-1.5 right-1.5 border-t border-r")} />
      <span className={clsx(mark, "bottom-1.5 left-1.5 border-b border-l")} />
      <span className={clsx(mark, "bottom-1.5 right-1.5 border-b border-r")} />
    </>
  )
}

function BookCoverReveal({ scale, onOpen }: { scale: number, onOpen: () => void }) {
    const [isOpened, setIsOpened] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const handleOpen = () => {
        if (isOpened) return
        setIsOpened(true)
        onOpen()
    }

    return (
        <div 
            className={clsx(
                "absolute inset-0 z-50 flex items-center justify-center [perspective:1600px]",
                isOpened ? "pointer-events-none" : "pointer-events-auto"
            )}
            onClick={handleOpen}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <CoverPanel side="left" opened={isOpened}>
              <ConstellationMark />
            </CoverPanel>
            <CoverPanel side="right" opened={isOpened}>
              <GraduationMark />
            </CoverPanel>

            <div className={clsx(
                "absolute inset-y-0 w-3 bg-black/50 blur-md z-30 transition-opacity duration-500",
                isOpened ? "opacity-0" : "opacity-100"
            )} />

            <div 
                className={clsx(
                    "absolute z-40 flex flex-col items-center justify-center transition-all duration-700",
                    isOpened ? "opacity-0 scale-110" : "opacity-100 scale-100"
                )}
            >
                <div className={clsx(
                    "rounded-full flex items-center justify-center relative shadow-[0_12px_36px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-out",
                    isHovered ? "scale-105" : "scale-100"
                )}
                style={{
                    width: 92 * Math.max(scale, 0.72),
                    height: 92 * Math.max(scale, 0.72),
                    background: 'conic-gradient(from 180deg, #b45309, #fde68a, #b45309, #fcd34d, #b45309)',
                }}>
                    <div className="absolute inset-[3px] rounded-full bg-[#16132e] flex items-center justify-center border border-[#fcd34d]/30">
                         <svg width="58%" height="58%" viewBox="0 0 24 24" stroke="#fcd34d" strokeWidth="1" fill="none">
                            <circle cx="12" cy="12" r="8" strokeOpacity="0.45" />
                            <path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" fill="#fcd34d" fillOpacity="0.22" />
                            <circle cx="12" cy="12" r="2" fill="#fcd34d" />
                         </svg>
                    </div>
                </div>
                
                <span className={clsx(
                    "mt-3 font-luxury-sans text-[#fcd34d] text-[10px] tracking-[0.32em] uppercase transition-opacity duration-300",
                    isHovered ? "opacity-100" : "opacity-70"
                )}>
                    Mở thiệp
                </span>
            </div>
        </div>
    )
}

function CoverPanel({
  side,
  opened,
  children,
}: {
  side: 'left' | 'right'
  opened: boolean
  children: ReactNode
}) {
  const isLeft = side === 'left'
  return (
    <div
      className={clsx(
        "absolute top-0 bottom-0 w-1/2 z-20 transition-all duration-[1400ms] ease-[cubic-bezier(0.7,0,0.2,1)] overflow-hidden",
        isLeft ? "left-0 origin-left border-r border-[#fcd34d]/20" : "right-0 origin-right border-l border-[#fcd34d]/20",
        opened
          ? (isLeft ? "-rotate-y-[105deg] opacity-0" : "rotate-y-[105deg] opacity-0")
          : "rotate-y-0 opacity-100"
      )}
      style={{
        backgroundColor: '#14122c',
        backgroundImage: isLeft
          ? 'radial-gradient(circle at 0% 0%, rgba(252,211,77,0.18), transparent 46%)'
          : 'radial-gradient(circle at 100% 100%, rgba(252,211,77,0.16), transparent 48%)',
        boxShadow: isLeft ? 'inset -10px 0 18px rgba(0,0,0,0.35)' : 'inset 10px 0 18px rgba(0,0,0,0.35)',
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="absolute inset-3 border border-[#fcd34d]/15 pointer-events-none" />
      {children}
    </div>
  )
}

function ConstellationMark() {
  return (
    <svg viewBox="0 0 200 320" className="absolute inset-0 w-full h-full p-6 text-[#fcd34d]" aria-hidden>
      <g fill="currentColor" stroke="currentColor" strokeWidth="0.6" opacity="0.85">
        <circle cx="48" cy="70" r="2.2" />
        <circle cx="92" cy="108" r="2.4" />
        <circle cx="70" cy="156" r="2" />
        <circle cx="118" cy="188" r="2.6" />
        <circle cx="86" cy="230" r="2" />
        <circle cx="140" cy="248" r="1.8" />
        <path d="M48 70 L92 108 L70 156 L118 188 L86 230 L140 248" fill="none" strokeOpacity="0.55" />
        <path d="M92 108 L118 188" fill="none" strokeOpacity="0.35" />
      </g>
    </svg>
  )
}

function GraduationMark() {
  return (
    <svg viewBox="0 0 200 320" className="absolute inset-0 m-auto w-[58%] h-[58%] text-[#fcd34d]" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.9">
        <path d="M20 118 L100 78 L180 118 L100 158 Z" fill="currentColor" fillOpacity="0.12" />
        <path d="M52 132 V176 C52 176 72 196 100 196 C128 196 148 176 148 176 V132" />
        <path d="M180 118 V168" />
        <circle cx="180" cy="176" r="5" fill="currentColor" />
      </g>
    </svg>
  )
}
