import { useEffect, useState } from 'react'
import { CheckCircle2, MapPin, Utensils } from 'lucide-react'
import { MapModal } from '@/components/ui/MapModal'
import type { DesignConfig } from '@/types/design'

export function MealInviteSection({ invite, mealStatus, onRespond }: {
  invite: NonNullable<DesignConfig['mealInvite']>
  mealStatus: number
  onRespond: (status: number) => Promise<boolean>
}) {
  const [showMap, setShowMap] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(mealStatus)
  const hasLocation = Boolean(invite.address.trim() || (invite.lat !== '' && invite.lng !== '' && invite.lat != null && invite.lng != null))

  useEffect(() => {
    setSelectedStatus(mealStatus)
  }, [mealStatus])

  const handleResponse = async (nextStatus: number) => {
    setSubmitting(true)
    const success = await onRespond(nextStatus)
    if (success) setSelectedStatus(nextStatus)
    setSubmitting(false)
  }

  return <>
    <div className="w-full min-w-0 max-w-lg mx-auto px-5 py-14 text-center overflow-hidden">
      <div className="flex items-center justify-center gap-2 mb-3"><div className="h-px w-10 bg-gradient-to-r from-transparent to-[#fcd34d]/50" /><Utensils size={18} className="text-[#fcd34d]" /><div className="h-px w-10 bg-gradient-to-l from-transparent to-[#fcd34d]/50" /></div>
      <h2 className="text-2xl font-semibold tracking-wide text-[#fef3c7]" style={{ fontFamily: 'Playfair Display, serif' }}>{invite.title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-[#cbd5e1] whitespace-pre-wrap" style={{ fontFamily: 'Montserrat, sans-serif' }}>{invite.content}</p>
      {hasLocation && <button type="button" onClick={() => setShowMap(true)} className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#fcd34d]/35 px-4 py-2.5 text-xs text-[#fcd34d] hover:bg-[#fcd34d]/10 transition-colors"><MapPin size={15} />{invite.address || 'Xem địa điểm dùng bữa'}</button>}
      {invite.note?.trim() && <p className="mt-3 w-full break-words text-xs leading-relaxed text-[#94a3b8] whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{invite.note}</p>}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" aria-pressed={selectedStatus === 1} disabled={submitting} onClick={() => handleResponse(1)} className={`rounded-full border px-5 py-3 text-xs font-bold tracking-wide transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-60 ${selectedStatus === 1 ? 'border-[#fde68a] bg-[#fcd34d] text-[#1e1b4b] shadow-[0_0_28px_rgba(252,211,77,0.55)] ring-2 ring-[#fcd34d]/30 ring-offset-2 ring-offset-[#16132e]' : 'border-[#fcd34d] bg-[#fcd34d]/90 text-[#1e1b4b] shadow-[0_0_20px_rgba(252,211,77,0.32)] hover:bg-[#fde68a] hover:shadow-[0_0_30px_rgba(252,211,77,0.52)]'}`}>{submitting && selectedStatus !== 1 ? 'Đang lưu…' : selectedStatus === 1 ? <><CheckCircle2 size={14} className="mr-1 inline" />Đã chọn tham gia dùng bữa</> : 'Tham gia dùng bữa'}</button>
        <button type="button" aria-pressed={selectedStatus === 2} disabled={submitting} onClick={() => handleResponse(2)} className={`rounded-full border px-4 py-2.5 text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 ${selectedStatus === 2 ? 'border-[#94a3b8]/70 bg-white/10 text-[#fef3c7] ring-1 ring-white/20' : 'border-white/15 text-[#94a3b8] hover:bg-white/5'}`}>{submitting && selectedStatus !== 2 ? 'Đang lưu…' : selectedStatus === 2 ? 'Đã chọn không tham gia' : 'Không tham gia'}</button>
      </div>
    </div>
    {showMap && <MapModal lat={invite.lat} lng={invite.lng} query={invite.address} label={invite.address} onClose={() => setShowMap(false)} />}
  </>
}
