import { useState } from 'react'
import { MapPin, Utensils } from 'lucide-react'
import { MapModal } from '@/components/ui/MapModal'
import type { DesignConfig } from '@/types/design'

export function MealInviteSection({ invite }: { invite: NonNullable<DesignConfig['mealInvite']> }) {
  const [showMap, setShowMap] = useState(false)
  const hasLocation = Boolean(invite.address.trim() || (invite.lat !== '' && invite.lng !== '' && invite.lat != null && invite.lng != null))

  return <>
    <div className="w-full max-w-lg mx-auto px-5 py-14 text-center">
      <div className="flex items-center justify-center gap-2 mb-3"><div className="h-px w-10 bg-gradient-to-r from-transparent to-[#fcd34d]/50" /><Utensils size={18} className="text-[#fcd34d]" /><div className="h-px w-10 bg-gradient-to-l from-transparent to-[#fcd34d]/50" /></div>
      <h2 className="text-2xl font-semibold tracking-wide text-[#fef3c7]" style={{ fontFamily: 'Playfair Display, serif' }}>{invite.title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-[#cbd5e1] whitespace-pre-wrap" style={{ fontFamily: 'Montserrat, sans-serif' }}>{invite.content}</p>
      {hasLocation && <button type="button" onClick={() => setShowMap(true)} className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#fcd34d]/35 px-4 py-2.5 text-xs text-[#fcd34d] hover:bg-[#fcd34d]/10 transition-colors"><MapPin size={15} />{invite.address || 'Xem địa điểm dùng bữa'}</button>}
    </div>
    {showMap && <MapModal lat={invite.lat} lng={invite.lng} query={invite.address} label={invite.address} onClose={() => setShowMap(false)} />}
  </>
}
