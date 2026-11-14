import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Heart, Search, Trash2, RefreshCw } from 'lucide-react'
import { ModalConfirm } from '@/components/ui/ModalConfirm'
import { useToastStore } from '@/stores/useGuestStore'

interface WishItem {
  id: string
  guest_id: string | null
  guest_name: string
  message: string
  created_at: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function WishesPage() {
  const [wishes, setWishes] = useState<WishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.showToast)

  const fetchWishes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('wishes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWishes((data as WishItem[]) || [])
    } catch (err) {
      console.error(err)
      showToast('Không thể tải danh sách lời chúc', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWishes()
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const { error } = await supabase
        .from('wishes')
        .delete()
        .eq('id', deleteId)

      if (error) throw error
      setWishes(wishes.filter((w) => w.id !== deleteId))
      showToast('Đã xóa lời chúc')
    } catch (err) {
      console.error(err)
      showToast('Lỗi khi xóa lời chúc', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  const filteredWishes = wishes.filter(
    (w) =>
      w.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      w.message.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Lời chúc từ khách</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
              {wishes.length}
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Tổng hợp tất cả lời chúc mừng mà khách đã gửi qua thiệp mời
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchWishes}
            className="p-2 sm:p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium"
            title="Tải lại"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm mb-4 sm:mb-6 flex items-center gap-3 shrink-0">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên khách hoặc nội dung lời chúc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-auto pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Đang tải lời chúc...
          </div>
        ) : filteredWishes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center">
            <Heart size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-700 font-medium">Chưa có lời chúc nào</p>
            <p className="text-slate-400 text-xs mt-1">
              {search ? 'Không tìm thấy kết quả phù hợp với từ khóa' : 'Khi khách mở thiệp và gửi lời chúc, chúng sẽ hiển thị ở đây'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredWishes.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {item.guest_name.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                          {item.guest_name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Xóa lời chúc"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap pl-1 sm:pl-10">
                    "{item.message}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {Boolean(deleteId) && (
        <ModalConfirm
          loading={false}
          title="Xóa lời chúc"
          message="Bạn có chắc chắn muốn xóa lời chúc này không? Thao tác này không thể hoàn tác."
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
