import { useState } from 'react'
import { useDesignStore, normalizeUrl } from '@/stores/useDesignStore'
import { 
  Type, Save, GraduationCap, Eye, Layers, Music, Volume2, Images, 
  Trash2, ChevronRight, ArrowLeft, ArrowUp, ArrowDown, Plus
} from 'lucide-react'
import { InvitationRenderer } from '@/components/InvitationRenderer'
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
  { name: 'Dancing Script', label: 'Dancing Script (Handwriting)' },
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
    selectElement, updateElement, addElement, updateBackground, updateMusic, updatePhotos, uploadFile, removeElement
  } = useDesignStore()

  const [activeTab, setActiveTab] = useState<'content' | 'theme' | 'music' | 'photos'>('content')

  const selectedEl = config.elements.find(e => e.id === selectedElementId)

  // Calculate scale for preview canvas on mobile
  const previewScale = Math.min(0.68, (typeof window !== 'undefined' ? window.innerWidth - 32 : 320) / (config.width || 420))

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPhotoUploading(true)
    try {
      const urls: string[] = []
      for (const file of files) {
        const url = await uploadFile(file)
        if (url) urls.push(url)
      }
      if (urls.length) {
        updatePhotos([...(config.photos || []), ...urls])
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
    <div className="flex flex-col min-h-screen bg-slate-100 pb-24">
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

      {/* Mini Preview Window */}
      <div className="bg-slate-900/5 py-4 px-2 flex justify-center items-center overflow-hidden border-b border-slate-200">
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
            />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="sticky top-[45px] z-20 bg-white border-b border-slate-200 flex px-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'content', label: 'Nội dung', icon: Type },
          { key: 'theme', label: 'Phông nền', icon: Layers },
          { key: 'music', label: 'Nhạc nền', icon: Music },
          { key: 'photos', label: 'Album', icon: Images },
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
      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
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
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {el.type === 'dynamic' ? '[Tên khách mời]' : (el.content || `[${el.type}]`)}
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Album ảnh tốt nghiệp</p>
              <p className="text-[11px] text-slate-500">Hiển thị dạng cuộn gallery ở cuối thiệp.</p>
            </div>

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

            {(config.photos || []).length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                {(config.photos || []).map((url, i) => (
                  <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(config.photos || [])]
                        updated.splice(i, 1)
                        updatePhotos(updated)
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full shadow"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
