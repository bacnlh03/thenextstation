import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useGuestStore } from '@/stores/useGuestStore'
import { useShallow } from 'zustand/react/shallow'
import { ModalConfirm } from '@/components/ui/ModalConfirm'
import { ModalAddGuest } from '@/components/ui/ModalAddGuest'
// import { ModalQRBatch } from '@/components/ui/ModalQRBatch'
import { GuestToolbar } from '@/components/guest/GuestToolbar'
import { GuestTable } from '@/components/guest/GuestTable'

export function GuestsPage() {
  const { 
    guests, 
    loading, 
    filter, 
    // selectedIds,
  } = useGuestStore(useShallow(state => ({
    guests: state.guests,
    loading: state.loading,
    filter: state.filter,
    // selectedIds: state.selectedIds,
  })))

  const fetchGuests = useGuestStore(state => state.fetchGuests)
  const setFilter = useGuestStore(state => state.setFilter)
  const updateName = useGuestStore(state => state.updateName)
  const updateStatus = useGuestStore(state => state.updateStatus)
  const toggleAllowWishes = useGuestStore(state => state.toggleAllowWishes)
  const deleteGuest = useGuestStore(state => state.deleteGuest)
  const createGuests = useGuestStore(state => state.createGuests)

  const [showAdd, setShowAdd] = useState(false)
  // const [showQR, setShowQR] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchGuests()
  }, [fetchGuests])

  const handleDelete = async () => {
    if (deleteId) {
      await deleteGuest(deleteId)
      setDeleteId(null)
    }
  }

  const handleCreate = async (names: string[]) => {
    const success = await createGuests(names)
    if (success) setShowAdd(false)
  }

  // const selectedGuests = guests.filter(g => selectedIds.has(g.id))

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Khách mời</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Quản lý danh sách khách và chia sẻ thiệp</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setShowAdd(true)} 
            className="w-full sm:w-auto justify-center bg-emerald-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium shadow-sm hover:bg-emerald-700 flex items-center gap-2 text-sm sm:text-base transition"
          >
            <UserPlus size={18}/> Thêm danh sách
          </button>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 shrink-0 flex flex-col gap-4">
        <GuestToolbar 
          filter={filter} 
          loading={loading} 
          onFilterChange={setFilter} 
          onRefresh={fetchGuests}
        />
      </div>

      <div className="flex-1 min-h-0">
        <GuestTable 
          guests={guests} 
          loading={loading} 
          onUpdateName={updateName} 
          onDelete={setDeleteId}
          onUpdateStatus={updateStatus}
          onToggleAllowWishes={toggleAllowWishes}
        />
      </div>

      {showAdd && <ModalAddGuest onClose={() => setShowAdd(false)} onSubmit={handleCreate} />}
      {deleteId && (() => {
        const guestToDelete = guests.find(g => g.id === deleteId)
        const isConfirmed = guestToDelete?.status === 2
        return (
          <ModalConfirm 
            loading={loading} 
            onClose={() => setDeleteId(null)} 
            onConfirm={handleDelete}
            title={isConfirmed ? "Cảnh báo xóa khách tham dự" : undefined}
            message={isConfirmed ? `Khách mời "${guestToDelete?.full_name}" đã xác nhận tham dự. Bạn có chắc chắn muốn xóa không?` : undefined}
          />
        )
      })()}
      {/* QR Modal — tạm thời tắt
      {showQR && <ModalQRBatch guests={selectedGuests} onClose={() => setShowQR(false)} />}
      */}
    </div>
  )
}
