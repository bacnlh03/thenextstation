import { useState } from 'react'
import { useDesignStore, normalizeUrl } from '@/stores/useDesignStore'
import { 
  Type, Save, GraduationCap, Eye, Layers, Music, Volume2, Images, 
  Trash2, ChevronRight, ArrowLeft, ArrowUp, ArrowDown, Plus, GripVertical,
  Sparkles, Grid, RotateCcw, RotateCw, MapPin
} from 'lucide-react'
import { normalizeMomentPhoto } from '@/types/design'
import type { MomentPhoto, PhotoFrameStyle } from '@/types/design'
import { InvitationRenderer } from '@/components/InvitationRenderer'
import { PhotoCollageCanvas } from '@/components/designer/PhotoCollageCanvas'
import { getImageAspectRatio } from '@/lib/image'
import { hasMapLocation } from '@/lib/map'
import clsx from 'clsx'

const FONTS = [
  { name: 'Merriweather', label: 'Merriweather (Serif)' },
  { name: 'Playfair Display', label: 'Playfair Display (Elegant)' },
  { name: 'Lora', label: 'Lora (Classic Serif)' },
  { name: 'Montserrat', label: 'Montserrat (Modern Sans)' },
  { name: 'Roboto', label: 'Roboto (Clean Sans)' },
  { name: 'Open Sans', label: 'Open Sans (Neutral Sans)' },
  { name: 'Quicksand', label: 'Quicksand (Round Sans)' },
  { name: 'Oswald', label: 'Oswald (Strong Sans)' },
  { name: 'Allura', label: 'Allura (Calligraphy)' },
  { name: 'Dancing Script', label: 'Dancing Script (Handwriting)' },
  { name: 'Playwrite AU SA Guides', label: 'Playwrite Australia SA Guides (Handwriting)' },
  { name: 'Momo Signature', label: 'Momo Signature (Signature)' },
  { name: 'Great Vibes', label: 'Great Vibes (Calligraphy)' },
  { name: 'Pacifico', label: 'Pacifico (Retro Script)' },
  { name: 'Charm', label: 'Charm (Decorative Serif)' },
  { name: 'Saira Stencil One', label: 'Saira Stencil (Military)' },
  { name: 'sans-serif', label: 'Sans Serif (System)' },
]

interface Props {
  onOpenPreview: () => void
  playPreview: () => void
  stopPreview: () => void
  isPlaying: boolean
  musicDuration: number
  photoUploading: boolean
  setPhotoUploading: (val: boolean) => void
}

export function MobileDesigner({
  onOpenPreview,
  playPreview,
  stopPreview,
  isPlaying,
  photoUploading,
  setPhotoUploading,
}: Props) {
  const {
    config, selectedElementId, loading, saveConfig,
    selectElement, updateElement, addElement, updateBackground, updateMusic, updatePhotos, updatePhotoLayout, uploadFile, removeElement, optimizeExistingPhotos, restoreOriginalPhotoLinks, updateExistingPhotoRatios
  } = useDesignStore()

  const [activeTab, setActiveTab] = useState<'content' | 'theme' | 'music' | 'photos'>('content')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [optimizingPhotos, setOptimizingPhotos] = useState(false)
  const [restoringOriginalPhotos, setRestoringOriginalPhotos] = useState(false)
  const [updatingPhotoRatios, setUpdatingPhotoRatios] = useState(false)

  const normalizedPhotos: MomentPhoto[] = (config.photos || []).map((p, i) =>
    normalizeMomentPhoto(p, i, config.photos?.length || 1)
  )

  const selectedPhoto = normalizedPhotos.find(p => p.id === selectedPhotoId) || null

  const updatePhotoById = (id: string, updates: Partial<MomentPhoto>) => {
    const list = normalizedPhotos.map(p => {
      if (p.id === id) {
        return { ...p, ...updates }
      }
      return p
    })
    updatePhotos(list)
  }

  const bringPhotoToFront = (id: string) => {
    const maxZ = Math.max(...normalizedPhotos.map(p => p.zIndex || 1), 1)
    updatePhotoById(id, { zIndex: maxZ + 1 })
  }

  const sendPhotoToBack = (id: string) => {
    const minZ = Math.min(...normalizedPhotos.map(p => p.zIndex || 1), 1)
    updatePhotoById(id, { zIndex: Math.max(1, minZ - 1) })
  }

  const stepPhotoLayer = (id: string, step: number) => {
    const current = normalizedPhotos.find(p => p.id === id)
    if (!current) return
    updatePhotoById(id, { zIndex: Math.max(1, (current.zIndex || 1) + step) })
  }

  const autoArrangePhotos = () => {
    const list = normalizedPhotos.map((p, index) => {
      const isLeft = index % 2 === 0
      const defaultRotation = isLeft ? -7 + ((index * 3) % 9) : 5 - ((index * 2) % 7)
      const defaultX = isLeft ? 25 + (index % 3) * 8 : 185 - (index % 3) * 8
      const defaultY = 20 + index * 125
      return {
        ...p,
        x: defaultX,
        y: defaultY,
        rotation: defaultRotation,
        zIndex: index + 1,
      }
    })
    updatePhotos(list)
  }

  const selectedEl = config.elements.find(e => e.id === selectedElementId)

  // Calculate scale for preview canvas on mobile
  const previewScale = Math.min(0.68, (typeof window !== 'undefined' ? window.innerWidth - 32 : 320) / (config.width || 420))

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPhotoUploading(true)
    try {
      const uploadedPhotos: { url: string; aspectRatio?: number }[] = []
      for (const file of files) {
        const aspectRatio = await getImageAspectRatio(file)
        const url = await uploadFile(file)
        if (url) uploadedPhotos.push({ url, aspectRatio })
      }
      if (uploadedPhotos.length) {
        const current = normalizedPhotos
        const startIndex = current.length
        const newPhotos: MomentPhoto[] = uploadedPhotos.map((uploaded, i) => {
          const idx = startIndex + i
          const isLeft = idx % 2 === 0
          return {
            id: `photo_${Date.now()}_${i}`,
            url: uploaded.url,
            aspectRatio: uploaded.aspectRatio,
            x: isLeft ? 25 + (idx % 3) * 8 : 185 - (idx % 3) * 8,
            y: 20 + idx * 125,
            width: 175,
            rotation: isLeft ? -7 + ((idx * 3) % 9) : 5 - ((idx * 2) % 7),
            zIndex: idx + 1,
            frame: 'polaroid' as PhotoFrameStyle
          }
        })
        updatePhotos([...current, ...newPhotos])
      }
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadFile(file)
    if (url) {
      updateBackground({ image: url })
    }
    e.target.value = ''
  }

  const handleOptimizeExistingPhotos = async () => {
    if (!normalizedPhotos.length || optimizingPhotos) return
    if (!window.confirm(`Tối ưu ${normalizedPhotos.length} ảnh hiện có? Ảnh gốc sẽ được giữ lại.`)) return

    setOptimizingPhotos(true)
    try {
      await optimizeExistingPhotos()
    } finally {
      setOptimizingPhotos(false)
    }
  }

  const handleRestoreOriginalPhotos = async () => {
    if (restoringOriginalPhotos || optimizingPhotos || !normalizedPhotos.length) return
    if (!window.confirm('Khôi phục liên kết ảnh gốc cho 25 ảnh? Không xóa hay upload lại file nào.')) return

    setRestoringOriginalPhotos(true)
    try {
      await restoreOriginalPhotoLinks()
    } finally {
      setRestoringOriginalPhotos(false)
    }
  }

  const handleUpdatePhotoRatios = async () => {
    if (updatingPhotoRatios || optimizingPhotos || restoringOriginalPhotos || !normalizedPhotos.length) return
    setUpdatingPhotoRatios(true)
    try {
      await updateExistingPhotoRatios()
    } finally {
      setUpdatingPhotoRatios(false)
    }
  }

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadFile(file)
    if (url) {
      updateMusic({ url, startTime: 0, endTime: 0 })
    }
    e.target.value = ''
  }

  const handleAddText = () => {
    addElement({
      id: `text_${Date.now()}`,
      type: 'text',
      content: 'Nội dung mới',
      x: 40,
      y: 120,
      style: {
        fontSize: '16px',
        color: '#1e293b',
        fontWeight: 'normal',
        fontFamily: 'Montserrat'
      }
    })
  }

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-slate-100 pb-24">
      {/* Top Mobile Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-indigo-600" size={20} />
          <span className="font-bold text-slate-800 text-sm">Thiết kế nhanh</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPreview}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 active:bg-slate-100"
          >
            <Eye size={14} /> Xem trước
          </button>
          <button
            onClick={() => saveConfig()}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save size={14} /> {loading ? 'Lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      {/* Mini Preview Window — focus on the editing canvas in Photos tab */}
      {activeTab !== 'photos' && (
      <div className="order-2 bg-slate-900/5 py-4 px-2 flex justify-center items-center overflow-hidden border-b border-slate-200">
        <div 
          className="relative bg-white shadow-xl rounded-lg overflow-hidden shrink-0 origin-top"
          style={{
            width: config.width * previewScale,
            height: config.height * previewScale,
          }}
        >
          <div 
            style={{
              width: config.width,
              height: config.height,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
          >
            <InvitationRenderer 
              config={config} 
              onElementClick={(id) => selectElement(id)}
              selectedId={selectedElementId}
              language="en"
            />
          </div>
        </div>
      </div>
      )}

      {/* Tabs Switcher */}
      <div className="order-1 sticky top-12 z-20 bg-white border-b border-slate-200 flex px-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'content', label: 'Nội dung', icon: Type },
          { key: 'theme', label: 'Phông nền', icon: Layers },
          { key: 'music', label: 'Nhạc nền', icon: Music },
          { key: 'photos', label: 'Khoảnh khắc', icon: Images },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any)
                if (tab.key !== 'content') selectElement(null)
              }}
              className={clsx(
                "flex-1 min-w-[75px] py-2.5 text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-colors",
                isActive 
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className={clsx(
        'order-3 min-w-0 max-w-lg mx-auto w-full overflow-x-hidden',
        activeTab === 'photos' ? 'p-0 space-y-4' : 'p-4 space-y-4'
      )}>
        {/* ── TAB 1: CONTENT (Chỉnh sửa text / layers) ── */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {selectedEl ? (
              /* Chi tiết phần tử đang chọn */
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <button
                    onClick={() => selectElement(null)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    <ArrowLeft size={14} /> Danh sách phần tử
                  </button>
                  <button
                    onClick={() => removeElement(selectedEl.id)}
                    className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition"
                  >
                    Xóa
                  </button>
                </div>

                {/* Text Content */}
                {selectedEl.type !== 'image' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nội dung chữ
                    </label>
                    <textarea
                      rows={2}
                      value={selectedEl.content || ''}
                      onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                      className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                    />
                  </div>
                )}

                {/* Font & Color */}
                {selectedEl.type !== 'image' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Font chữ
                      </label>
                      <select
                        value={selectedEl.style?.fontFamily || 'Montserrat'}
                        onChange={(e) => updateElement(selectedEl.id, {
                          style: { ...selectedEl.style, fontFamily: e.target.value }
                        })}
                        className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      >
                        {FONTS.map(f => (
                          <option key={f.name} value={f.name}>{f.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Màu chữ
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedEl.style?.color || '#000000'}
                          onChange={(e) => updateElement(selectedEl.id, {
                            style: { ...selectedEl.style, color: e.target.value }
                          })}
                          className="w-8 h-8 p-0 rounded-lg border border-slate-200 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-slate-500">
                          {selectedEl.style?.color || '#000000'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Font Size & Weight */}
                {selectedEl.type !== 'image' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Cỡ chữ: {selectedEl.style?.fontSize || '16px'}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        value={parseInt(selectedEl.style?.fontSize as string || '16')}
                        onChange={(e) => updateElement(selectedEl.id, {
                          style: { ...selectedEl.style, fontSize: `${e.target.value}px` }
                        })}
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Độ đậm
                      </label>
                      <button
                        onClick={() => updateElement(selectedEl.id, {
                          style: {
                            ...selectedEl.style,
                            fontWeight: selectedEl.style?.fontWeight === 'bold' ? 'normal' : 'bold'
                          }
                        })}
                        className={clsx(
                          "w-full py-1.5 px-3 rounded-lg text-xs font-bold border transition",
                          selectedEl.style?.fontWeight === 'bold'
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        )}
                      >
                        {selectedEl.style?.fontWeight === 'bold' ? 'Đậm (Bold)' : 'Thường (Normal)'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Nudge Position (Dịch chuyển vị trí bằng nút) */}
                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Vị trí (Dịch chuyển)
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => updateElement(selectedEl.id, { x: Math.max(0, (selectedEl.x || 0) - 5) })}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      ← Trái
                    </button>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => updateElement(selectedEl.id, { y: Math.max(0, (selectedEl.y || 0) - 5) })}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => updateElement(selectedEl.id, { y: (selectedEl.y || 0) + 5 })}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => updateElement(selectedEl.id, { x: (selectedEl.x || 0) + 5 })}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      Phải →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Danh sách các phần tử có trong thiệp */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Các phần tử trên thiệp ({config.elements.length})
                  </p>
                  <button
                    onClick={handleAddText}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition"
                  >
                    <Plus size={14} /> Thêm chữ
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {config.elements.map((el, idx) => (
                    <button
                      key={el.id}
                      onClick={() => selectElement(el.id)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                            {hasMapLocation(el) && <MapPin size={13} className="shrink-0 text-[#fcd34d]/70" />}
                            <span className="truncate">
                              {el.type === 'dynamic' ? '[Tên khách mời]' : (el.content || `[${el.type}]`)}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Loại: {el.type} · Cỡ: {el.style?.fontSize || 'mặc định'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: THEME (Phông nền & Màu nền) ── */}
        {activeTab === 'theme' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Màu nền</p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.background.color || '#ffffff'}
                  onChange={(e) => updateBackground({ color: e.target.value })}
                  className="w-12 h-10 p-0 rounded-lg border border-slate-200 cursor-pointer"
                />
                <span className="text-sm font-mono text-slate-600">
                  {config.background.color || '#ffffff'}
                </span>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ảnh nền thiệp</p>
              {config.background.image ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[9/16] max-h-48 w-fit">
                  <img
                    src={normalizeUrl(config.background.image)}
                    alt="Background"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => updateBackground({ image: '' })}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow hover:bg-red-700"
                    title="Xóa ảnh nền"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <Layers size={24} className="text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-indigo-600">Tải lên ảnh nền</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadBg}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: MUSIC (Nhạc nền) ── */}
        {activeTab === 'music' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nhạc nền thiệp</p>
              <p className="text-[11px] text-slate-500">Bài hát sẽ tự động phát khi khách mời mở thiệp.</p>
            </div>

            <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 text-xs font-bold cursor-pointer transition">
              <Music size={16} /> {config.music?.url ? 'Đổi bài hát khác' : 'Tải lên file nhạc (MP3)'}
              <input
                type="file"
                accept="audio/*"
                onChange={handleUploadAudio}
                className="hidden"
              />
            </label>

            {config.music?.url && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                    🎵 Đã tải lên file nhạc
                  </span>
                  <button
                    onClick={() => updateMusic({ url: '', startTime: 0, endTime: 0 })}
                    className="text-xs text-red-500 font-bold hover:underline"
                  >
                    Gỡ nhạc
                  </button>
                </div>

                <button
                  onClick={isPlaying ? stopPreview : playPreview}
                  className={clsx(
                    "w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow transition",
                    isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {isPlaying ? (
                    <><div className="w-2 h-2 bg-white rounded-full animate-pulse" /> Dừng phát</>
                  ) : (
                    <><Volume2 size={16} /> Nghe thử</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: PHOTOS (Album ảnh kỷ niệm) ── */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ảnh khoảnh khắc</p>
              <p className="text-[11px] text-slate-400 mb-2">Tự do xoay góc, chỉnh kích thước và độ đè lớp (ảnh đè lên nhau).</p>
            </div>

            {/* Layout switch */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => updatePhotoLayout('collage')}
                className={clsx(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                  (config.photoLayout || 'collage') === 'collage' ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Sparkles size={13} /> Tự do (Collage)
              </button>
              <button
                type="button"
                onClick={() => updatePhotoLayout('grid')}
                className={clsx(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                  config.photoLayout === 'grid' ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Grid size={13} /> Lưới (Grid)
              </button>
            </div>

            {/* Upload button */}
            <label className={clsx(
              "w-full py-4 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition",
              photoUploading ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 bg-slate-50 hover:bg-white"
            )}>
              <Images size={22} className="text-slate-400 mb-1" />
              <span className="text-xs font-bold text-indigo-600">
                {photoUploading ? 'Đang tải lên...' : '+ Chọn ảnh tải lên'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadPhoto}
                className="hidden"
                disabled={photoUploading}
              />
            </label>

            {/* Tạm ẩn các nút tối ưu, khôi phục và cập nhật tỷ lệ ảnh cũ. */}
            {false && (
            <>
            <button
              type="button"
              onClick={handleOptimizeExistingPhotos}
              disabled={optimizingPhotos || photoUploading || !normalizedPhotos.length}
              className="w-full py-2.5 px-3 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={15} />
              {optimizingPhotos ? 'Đang tối ưu ảnh...' : `Tối ưu ${normalizedPhotos.length} ảnh hiện có`}
            </button>

            <button
              type="button"
              onClick={handleRestoreOriginalPhotos}
              disabled={restoringOriginalPhotos || optimizingPhotos || photoUploading || normalizedPhotos.length !== 25}
              className="w-full py-2.5 px-3 flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {restoringOriginalPhotos ? 'Đang khôi phục liên kết...' : 'Khôi phục liên kết ảnh gốc'}
            </button>

            <button
              type="button"
              onClick={handleUpdatePhotoRatios}
              disabled={updatingPhotoRatios || optimizingPhotos || restoringOriginalPhotos || photoUploading || !normalizedPhotos.length}
              className="w-full py-2.5 px-3 flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatingPhotoRatios ? 'Đang đọc tỷ lệ ảnh...' : 'Cập nhật tỷ lệ ảnh cũ'}
            </button>
            </>
            )}

            {/* Direct touch canvas for positioning photos on mobile */}
            <div className="px-4">
              <PhotoCollageCanvas />
            </div>

            {/* Selected Photo Inspector on Mobile */}
            {selectedPhoto && (
              <div className="hidden p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-2">
                    <img src={selectedPhoto.url} alt="Ảnh chọn" className="w-8 h-8 rounded object-cover border border-indigo-200" />
                    <div>
                      <p className="text-xs font-bold text-indigo-900">Ảnh đang chọn</p>
                      <p className="text-[10px] text-indigo-600">Góc: {selectedPhoto.rotation || 0}° · Lớp đè: #{selectedPhoto.zIndex}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                  >
                    Đóng
                  </button>
                </div>

                {/* Rotation */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Xoay ảnh:</span>
                    <span className="font-mono text-indigo-600">{selectedPhoto.rotation || 0}°</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    <button
                      type="button"
                      title="Xoay -90°"
                      onClick={() => updatePhotoById(selectedPhoto.id, { rotation: ((selectedPhoto.rotation || 0) - 90) % 360 })}
                      className="py-1 text-[10px] font-medium bg-white hover:bg-slate-50 border border-slate-200 rounded flex items-center justify-center gap-0.5"
                    >
                      <RotateCcw size={10} /> -90°
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhotoById(selectedPhoto.id, { rotation: -15 })}
                      className={clsx("py-1 text-[10px] font-mono rounded border", selectedPhoto.rotation === -15 ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200")}
                    >
                      -15°
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhotoById(selectedPhoto.id, { rotation: 0 })}
                      className={clsx("py-1 text-[10px] font-mono rounded border", selectedPhoto.rotation === 0 ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200")}
                    >
                      0°
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhotoById(selectedPhoto.id, { rotation: 15 })}
                      className={clsx("py-1 text-[10px] font-mono rounded border", selectedPhoto.rotation === 15 ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200")}
                    >
                      +15°
                    </button>
                    <button
                      type="button"
                      title="Xoay +90°"
                      onClick={() => updatePhotoById(selectedPhoto.id, { rotation: ((selectedPhoto.rotation || 0) + 90) % 360 })}
                      className="py-1 text-[10px] font-medium bg-white hover:bg-slate-50 border border-slate-200 rounded flex items-center justify-center gap-0.5"
                    >
                      <RotateCw size={10} /> +90°
                    </button>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={selectedPhoto.rotation || 0}
                    onChange={(e) => updatePhotoById(selectedPhoto.id, { rotation: parseInt(e.target.value) || 0 })}
                    className="w-full accent-indigo-600"
                  />
                </div>

                {/* Overlapping & Layers */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Độ đè lớp (Ảnh đè lên nhau):</span>
                    <span className="text-[10px] font-mono text-slate-500">Tầng #{selectedPhoto.zIndex}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => bringPhotoToFront(selectedPhoto.id)}
                      className="py-1.5 px-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Layers size={12} /> Lên trên cùng
                    </button>
                    <button
                      type="button"
                      onClick={() => sendPhotoToBack(selectedPhoto.id)}
                      className="py-1.5 px-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Layers size={12} className="rotate-180" /> Xuống dưới cùng
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => stepPhotoLayer(selectedPhoto.id, 1)}
                      className="py-1 px-2 bg-white border border-slate-200 text-slate-600 text-[11px] rounded flex items-center justify-center gap-1"
                    >
                      +1 Lớp (Lên)
                    </button>
                    <button
                      type="button"
                      onClick={() => stepPhotoLayer(selectedPhoto.id, -1)}
                      className="py-1 px-2 bg-white border border-slate-200 text-slate-600 text-[11px] rounded flex items-center justify-center gap-1"
                    >
                      -1 Lớp (Xuống)
                    </button>
                  </div>
                </div>

                {/* Size */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Kích thước ảnh:</span>
                    <span className="font-mono text-indigo-600">{selectedPhoto.width}px</span>
                  </div>
                  <input
                    type="range"
                    min="110"
                    max="300"
                    step="5"
                    value={selectedPhoto.width}
                    onChange={(e) => updatePhotoById(selectedPhoto.id, { width: parseInt(e.target.value) || 175 })}
                    className="w-full accent-indigo-600"
                  />
                </div>


                {/* Frame */}
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">Khung ảnh:</p>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => updatePhotoById(selectedPhoto.id, { frame: 'polaroid' })}
                      className={clsx(
                        "py-1 text-[10px] font-medium rounded border",
                        (selectedPhoto.frame || 'polaroid') === 'polaroid' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-600"
                      )}
                    >
                      Polaroid
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhotoById(selectedPhoto.id, { frame: 'gold' })}
                      className={clsx(
                        "py-1 text-[10px] font-medium rounded border",
                        selectedPhoto.frame === 'gold' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-600"
                      )}
                    >
                      Viền vàng
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhotoById(selectedPhoto.id, { frame: 'borderless' })}
                      className={clsx(
                        "py-1 text-[10px] font-medium rounded border",
                        selectedPhoto.frame === 'borderless' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-600"
                      )}
                    >
                      Không viền
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const updated = normalizedPhotos.filter(p => p.id !== selectedPhoto.id)
                    updatePhotos(updated)
                    setSelectedPhotoId(null)
                  }}
                  className="w-full py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 font-medium border border-red-200"
                >
                  <Trash2 size={12} /> Xóa ảnh này
                </button>
              </div>
            )}

            {/* Photo list */}
            {normalizedPhotos.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Nhấp vào ảnh để chỉnh sửa ({normalizedPhotos.length})</span>
                  <button
                    type="button"
                    onClick={autoArrangePhotos}
                    className="text-[10px] text-indigo-600 font-medium hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles size={10} /> Tự động xếp
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {normalizedPhotos.map((photo, i) => {
                    const isSelected = selectedPhotoId === photo.id
                    return (
                      <div
                        key={photo.id || photo.url + i}
                        onClick={() => setSelectedPhotoId(photo.id)}
                        className={clsx(
                          "relative aspect-square rounded-xl overflow-hidden border bg-slate-100 flex flex-col justify-between shadow-xs transition-all cursor-pointer",
                          isSelected ? "ring-2 ring-indigo-600 border-indigo-600" : "border-slate-200"
                        )}
                      >
                        <img src={photo.url} alt={`Ảnh ${i + 1}`} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

                        {/* Top Bar with Badge & Delete */}
                        <div className="relative z-10 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/60 to-transparent">
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <GripVertical size={10} className="text-white/70" />
                            #{i + 1}
                          </span>
                          <span className="text-[9px] text-amber-300 font-mono bg-black/60 px-1 rounded backdrop-blur-sm">
                            {photo.rotation || 0}°
                          </span>
                        </div>

                        {/* Bottom Bar: Quick select / info */}
                        <div className="relative z-10 flex items-center justify-between p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <span className="text-[10px] text-white/90 font-medium">
                            Lớp #{photo.zIndex || i + 1}
                          </span>
                          <span className="text-[10px] text-indigo-300 font-medium">
                            {isSelected ? 'Đang chọn' : 'Chạm chỉnh'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
