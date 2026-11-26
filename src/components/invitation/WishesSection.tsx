import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, MessageCircleHeart, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import type { InvitationLanguage } from '@/lib/invitationLanguage'

interface Wish {
  id: string
  guest_name: string
  message: string
  created_at: string
}

interface Props {
  guestId: string | null
  guestName: string
  allowWishes?: boolean
  language?: InvitationLanguage
}

const MAX_CHARS = 300

function timeAgo(isoDate: string, language: InvitationLanguage): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return language === 'en' ? 'just now' : 'vừa xong'
  if (mins < 60) return language === 'en' ? `${mins} min ago` : `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return language === 'en' ? `${hours} hr ago` : `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return language === 'en' ? `${days} days ago` : `${days} ngày trước`
}

export function WishesSection({ guestId, guestName, allowWishes = true, language = 'vi' }: Props) {
  const isEnglish = language === 'en'
  const [wishes, setWishes] = useState<Wish[]>([])
  const [message, setMessage] = useState('')
  const [name, setName] = useState(guestName)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setName(guestName)
  }, [guestName])

  useEffect(() => {
    fetchWishes()
  }, [])

  async function fetchWishes() {
    const { data } = await supabase
      .from('wishes')
      .select('id, guest_name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setWishes(data as Wish[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError('')

    const { error: rpcErr } = await supabase.rpc('submit_wish', {
      p_guest_id: guestId ?? null,
      p_guest_name: name.trim() || 'Khách mời',
      p_message: message.trim(),
    })

    setSubmitting(false)
    if (rpcErr) {
      setError(isEnglish ? 'Something went wrong. Please try again.' : 'Có lỗi xảy ra, vui lòng thử lại.')
      return
    }

    setSubmitted(true)
    setMessage('')
    await fetchWishes()
    // Smooth scroll to top of list
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  const remaining = MAX_CHARS - message.length

  return (
    <div
      className="w-full max-w-lg mx-auto px-5 py-14"
    >
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#fcd34d]/50" />
          <MessageCircleHeart size={18} className="text-[#fcd34d]" />
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#fcd34d]/50" />
        </div>
        <h2
          className="text-2xl font-semibold tracking-wide text-[#fef3c7]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          {isEnglish ? 'Messages of Love' : 'Lời Chúc Mừng'}
        </h2>
        <p
          className="mt-1.5 text-xs tracking-[0.2em] uppercase text-[#94a3b8]"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          {isEnglish ? 'Share your warmest wishes' : 'Gửi đến những lời yêu thương'}
        </p>
      </div>

      {/* Form */}
      {allowWishes ? (
        !submitted ? (
          <form onSubmit={handleSubmit} className="mb-10">
            <div className="mb-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isEnglish ? 'Your name' : 'Tên của bạn'}
                maxLength={60}
                className={clsx(
                  'w-full bg-white/5 border border-[#fcd34d]/20 rounded-xl px-4 py-3',
                  'text-[#fef3c7] placeholder:text-[#64748b] text-base md:text-sm',
                  'focus:outline-none focus:border-[#fcd34d]/60 focus:bg-white/8 transition-all',
                  'font-[Montserrat,sans-serif]'
                )}
              />
            </div>

            <div className="relative mb-1.5">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
                placeholder={isEnglish ? 'Write your wishes…' : 'Viết lời chúc mừng của bạn…'}
                rows={4}
                className={clsx(
                  'w-full bg-white/5 border border-[#fcd34d]/20 rounded-xl px-4 py-3 resize-none',
                  'text-[#fef3c7] placeholder:text-[#64748b] text-base md:text-sm leading-relaxed',
                  'focus:outline-none focus:border-[#fcd34d]/60 focus:bg-white/8 transition-all',
                  'font-[Montserrat,sans-serif]'
                )}
              />
              <span
                className={clsx(
                  'absolute bottom-3 right-3 text-[10px] transition-colors',
                  remaining < 30 ? 'text-amber-400' : 'text-[#475569]'
                )}
              >
                {remaining}
              </span>
            </div>

            {error && (
              <p className="text-red-400 text-xs mb-2 pl-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold tracking-widest uppercase transition-all duration-300',
                'font-[Montserrat,sans-serif]',
                message.trim() && !submitting
                  ? 'bg-[#fcd34d] text-[#1e1b4b] hover:bg-[#fbbf24] shadow-[0_0_20px_rgba(252,211,77,0.3)] hover:shadow-[0_0_28px_rgba(252,211,77,0.5)] hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white/5 text-[#475569] cursor-not-allowed border border-white/10'
              )}
            >
              {submitting ? (
                <span className="animate-pulse">{isEnglish ? 'Sending…' : 'Đang gửi…'}</span>
              ) : (
                <>
                  <Send size={14} />
                  {isEnglish ? 'Send wishes' : 'Gửi lời chúc'}
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="mb-10 flex flex-col items-center gap-3 py-6">
            <Sparkles size={28} className="text-[#fcd34d] animate-pulse" />
            <p
              className="text-[#fef3c7] text-base text-center"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {isEnglish ? 'Thank you for your kind wishes! 🎓' : 'Cảm ơn bạn đã gửi lời chúc! 🎓'}
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-[10px] tracking-widest uppercase text-[#64748b] hover:text-[#94a3b8] transition-colors"
            >
              {isEnglish ? 'Send another wish' : 'Gửi thêm lời chúc'}
            </button>
          </div>
        )
      ) : (
        <div className="mb-10 py-6 px-4 rounded-xl border border-[#fcd34d]/10 bg-white/[0.02] text-center">
          <p className="text-xs text-[#94a3b8]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {isEnglish ? 'Wishes are currently closed for this invitation.' : 'Tính năng gửi lời chúc hiện đang tạm đóng cho thiệp này'}
          </p>
        </div>
      )}

      {/* Wishes list */}
      {wishes.length > 0 && (
        <div ref={listRef} className="space-y-3">
          {wishes.map(w => (
            <WishCard key={w.id} wish={w} language={language} />
          ))}
        </div>
      )}
    </div>
  )
}

function WishCard({ wish, language }: { wish: Wish; language: InvitationLanguage }) {
  return (
    <div
      className="relative rounded-2xl border border-[#fcd34d]/12 bg-white/[0.04] md:backdrop-blur-sm px-5 py-4"
    >
      {/* Subtle glow dot */}
      <span className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#fcd34d]/30" />

      <div className="flex items-baseline gap-2 mb-1.5">
        <span
          className="text-sm font-semibold text-[#fef3c7]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          {wish.guest_name}
        </span>
        <span className="text-[10px] text-[#475569]">{timeAgo(wish.created_at, language)}</span>
      </div>
      <p
        className="text-sm text-[#cbd5e1] leading-relaxed"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        {wish.message}
      </p>
    </div>
  )
}

