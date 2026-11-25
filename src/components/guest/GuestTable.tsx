import { useState } from 'react'
import { Pencil, Save, X, Trash2, Loader2, Check, MessageSquareHeart, MessageSquareOff, Utensils } from 'lucide-react'
import type { Guest } from '@/types'
import clsx from 'clsx'

interface Props {
  guests: Guest[]
  loading: boolean
  onUpdateName: (id: string, name: string) => void
  onDelete: (id: string) => void
  onToggleAllowWishes?: (id: string, allow: boolean) => void
  onToggleAllowMealInvite?: (id: string, allow: boolean) => void
}

export function GuestTable({ guests, loading, onUpdateName, onDelete, onToggleAllowWishes, onToggleAllowMealInvite }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNameModel, setEditNameModel] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyUrl = (guest: Guest, language: 'vi' | 'en') => {
    const baseUrl = guest.slug
      ? `${window.location.origin}/to/${guest.slug}`
      : `${window.location.origin}/invitation?id=${guest.id}`
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}lang=${language}`
    navigator.clipboard.writeText(url)
    const key = `${guest.id}-${language}`
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const startEdit = (guest: Guest) => {
    setEditingId(guest.id)
    setEditNameModel(guest.full_name)
  }

  const saveEdit = (guest: Guest) => {
    if (editNameModel !== guest.full_name && editNameModel.trim()) {
      onUpdateName(guest.id, editNameModel)
    }
    setEditingId(null)
  }
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--/-- --:--'
    const d = new Date(dateStr)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col">
      {/* Mobile Card View */}
      <div className="md:hidden overflow-y-auto flex-1 p-3 space-y-3">
        {loading && (
          <div className="py-12 text-center text-slate-400">
            <div className="flex justify-center items-center gap-2">
              <Loader2 className="animate-spin" /> Đang tải...
            </div>
          </div>
        )}

        {!loading && guests.length === 0 && (
          <div className="py-12 text-center text-slate-400 italic">Không có dữ liệu.</div>
        )}

        {guests.map((guest, idx) => (
          <div key={guest.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            {/* Top row: Name & Actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 font-semibold">#{idx + 1}</span>
                  {editingId === guest.id ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input 
                        autoFocus
                        value={editNameModel}
                        onChange={(e) => setEditNameModel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(guest)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="w-full px-2 py-1 text-sm border-2 border-emerald-500 rounded bg-white outline-none"
                      />
                      <button onClick={() => saveEdit(guest)} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600">
                        <Save size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span 
                      onClick={() => startEdit(guest)} 
                      className="font-bold text-slate-900 text-base break-words cursor-pointer"
                      title="Chạm để sửa tên"
                    >
                      {guest.full_name}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cập nhật: {formatDate(guest.updated_at)}
                </p>
              </div>

              {/* Action buttons (always visible on mobile) */}
              <div className="flex items-center gap-1 shrink-0">
                {(['vi', 'en'] as const).map((language) => {
                  const key = `${guest.id}-${language}`
                  return (
                    <button
                      key={language}
                      onClick={() => copyUrl(guest, language)}
                      title={`Copy link ${language === 'vi' ? 'tiếng Việt' : 'English'}`}
                      className="min-w-8 p-2 text-[11px] font-bold text-slate-500 hover:text-indigo-600 active:bg-indigo-50 rounded-lg transition-colors border border-slate-200 bg-white"
                    >
                      {copiedKey === key ? <Check size={16} className="text-emerald-500" /> : language.toUpperCase()}
                    </button>
                  )
                })}
                <button 
                  onClick={() => startEdit(guest)} 
                  className="p-2 text-slate-500 hover:text-emerald-600 active:bg-emerald-50 rounded-lg border border-slate-200 bg-white"
                  title="Sửa tên"
                >
                  <Pencil size={16}/>
                </button>
                <button 
                  onClick={() => onDelete(guest.id)} 
                  className="p-2 text-slate-500 hover:text-red-600 active:bg-red-50 rounded-lg border border-slate-200 bg-white"
                  title="Xóa khách"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>

            {/* Bottom row: Status & Wishes setting */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
              {/* Wishes button */}
              <button
                type="button"
                onClick={() => {
                  const currentAllow = guest.allow_wishes !== false
                  onToggleAllowWishes?.(guest.id, !currentAllow)
                }}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 select-none",
                  guest.allow_wishes !== false
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-white text-slate-400 border-slate-300"
                )}
              >
                {guest.allow_wishes !== false ? (
                  <>
                    <MessageSquareHeart size={13} />
                    <span>Lời chúc: Bật</span>
                  </>
                ) : (
                  <>
                    <MessageSquareOff size={13} />
                    <span>Lời chúc: Tắt</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onToggleAllowMealInvite?.(guest.id, guest.allow_meal_invite !== true)}
                className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 select-none', guest.allow_meal_invite === true ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-400 border-slate-300')}
              >
                <Utensils size={13} /><span>Ăn: {guest.allow_meal_invite === true ? 'Bật' : 'Tắt'}</span>
              </button>
            </div>
            {guest.allow_meal_invite === true && (
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                <span className="text-slate-500">Phản hồi đi ăn</span>
                <MealResponseBadge status={guest.meal_status} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-y-auto flex-1 relative scroll-smooth">
        <table className="w-full text-left border-collapse min-w-[600px]">
        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="p-4 w-[5%] text-center bg-slate-50">#</th>
            <th className="p-4 w-[35%] bg-slate-50">Họ và Tên</th>
            <th className="p-4 w-[15%] text-center bg-slate-50">Lời chúc</th>
            <th className="p-4 w-[15%] text-center bg-slate-50">Mời ăn</th>
            <th className="p-4 w-[15%] text-center bg-slate-50">Phản hồi ăn</th>
            <th className="p-4 w-[17%] bg-slate-50">Cập nhật lúc</th>
            <th className="p-4 text-right bg-slate-50">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          
          {loading && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-slate-400">
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="animate-spin" /> Đang tải...
                </div>
              </td>
            </tr>
          )}
          
          {!loading && guests.length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-slate-400 italic">Không có dữ liệu.</td>
            </tr>
          )}
          
          {guests.map((guest, idx) => (
            <tr key={guest.id} 
              className="hover:bg-slate-50 transition group h-16"
            >
              <td className="p-4 text-center text-slate-400 font-mono text-sm">{idx + 1}</td>
              
              <td className="p-4 font-medium text-slate-900 text-lg">
                {editingId === guest.id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      autoFocus
                      value={editNameModel}
                      onChange={(e) => setEditNameModel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(guest)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="w-full px-2 py-1 border-2 border-emerald-500 rounded bg-white outline-none"
                    />
                  </div>
                ) : (
                  <div onDoubleClick={() => startEdit(guest)} className="cursor-pointer select-none" title="Double click để sửa">
                    {guest.full_name}
                  </div>
                )}
              </td>

              <td className="p-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const currentAllow = guest.allow_wishes !== false
                    onToggleAllowWishes?.(guest.id, !currentAllow)
                  }}
                  title={guest.allow_wishes !== false ? 'Bấm để tắt gửi lời chúc' : 'Bấm để bật gửi lời chúc'}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer hover:scale-105 active:scale-95 select-none",
                    guest.allow_wishes !== false
                      ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                      : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                  )}
                >
                  {guest.allow_wishes !== false ? (
                    <>
                      <MessageSquareHeart size={13} />
                      <span>Cho phép</span>
                    </>
                  ) : (
                    <>
                      <MessageSquareOff size={13} />
                      <span>Đã khóa</span>
                    </>
                  )}
                </button>
              </td>
              <td className="p-4 text-center">
                <button type="button" onClick={() => onToggleAllowMealInvite?.(guest.id, guest.allow_meal_invite !== true)} title={guest.allow_meal_invite === true ? 'Bấm để tắt lời mời đi ăn' : 'Bấm để bật lời mời đi ăn'} className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer hover:scale-105 active:scale-95 select-none', guest.allow_meal_invite === true ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600')}>
                  <Utensils size={13} /><span>{guest.allow_meal_invite === true ? 'Cho phép' : 'Đã khóa'}</span>
                </button>
              </td>
              <td className="p-4 text-center">{guest.allow_meal_invite === true && <MealResponseBadge status={guest.meal_status} />}</td>
              
              <td className="p-4 text-sm text-slate-500 font-mono">{formatDate(guest.updated_at)}</td>
              
              <td className="p-4 text-right">
                {editingId === guest.id ? (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => saveEdit(guest)} className="p-2 bg-emerald-500 text-white rounded shadow hover:bg-emerald-600"><Save size={16}/></button>
                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-500 hover:bg-slate-200 rounded"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(['vi', 'en'] as const).map((language) => {
                      const key = `${guest.id}-${language}`
                      return (
                        <button
                          key={language}
                          onClick={() => copyUrl(guest, language)}
                          title={`Copy link ${language === 'vi' ? 'tiếng Việt' : 'English'}`}
                          className="px-1.5 py-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 rounded transition-colors"
                        >
                          {copiedKey === key ? <Check size={16} className="text-emerald-500" /> : language.toUpperCase()}
                        </button>
                      )
                    })}
                    <button onClick={() => startEdit(guest)} className="p-2 text-slate-400 hover:text-emerald-600 rounded"><Pencil size={16}/></button>
                    <button onClick={() => onDelete(guest.id)} className="p-2 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16}/></button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function MealResponseBadge({ status }: { status?: number }) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
      status === 1 && 'border-emerald-200 bg-emerald-50 text-emerald-700',
      status === 2 && 'border-slate-200 bg-slate-100 text-slate-500',
      (status === undefined || status === 0) && 'border-amber-200 bg-amber-50 text-amber-700',
    )}>
      {status === 1 ? 'Có đi ăn' : status === 2 ? 'Không đi' : 'Chưa trả lời'}
    </span>
  )
}
