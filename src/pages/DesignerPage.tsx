import { useEffect, useMemo, useRef, useState } from 'react'
import { useDesignStore, normalizeUrl } from '@/stores/useDesignStore'
import type { DesignElement, MomentPhoto, PhotoFrameStyle } from '@/types/design'
import { normalizeMomentPhoto } from '@/types/design'
import { 
  Type, Save, GraduationCap, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, 
  Undo, Redo, Layers, ArrowUp, RotateCw, RotateCcw, Smile, Eye, X, Music, Volume2, 
  Images, Plus, Trash2, Sparkles, Grid, MapPin
} from 'lucide-react'
import { MobileDesigner } from '@/components/designer/MobileDesigner'
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
  { name: 'sans-serif', label: 'Sans Serif (System Default)' },
]

export function DesignerPage() {
  const { 
      config, selectedElementId, loading, fetchConfig, saveConfig, 
      selectElement, updateElement, addElement, moveElement, updateBackground, updateMusic, updatePhotos, updatePhotoLayout, uploadFile, removeElement, optimizeExistingPhotos, restoreOriginalPhotoLinks, updateExistingPhotoRatios,
      undo, redo, past, future, pushStateToHistory,
      bringToFront, sendToBack
  } = useDesignStore()
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const resizeStateRef = useRef<{
    id: string
    handle: string
    startX: number
    startY: number
    startElX: number
    startElY: number
    startW: number
    startH: number
    aspectRatio: number
  } | null>(null)
  const [guides, setGuides] = useState<{ type: 'horizontal' | 'vertical', pos: number }[]>([])
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [musicDuration, setMusicDuration] = useState(0)
  const [activeTab, setActiveTab] = useState<'design' | 'music' | 'photos'>('design')
  const [isPlaying, setIsPlaying] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [optimizingPhotos, setOptimizingPhotos] = useState(false)
  const [restoringOriginalPhotos, setRestoringOriginalPhotos] = useState(false)
  const [updatingPhotoRatios, setUpdatingPhotoRatios] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Photos Collage Studio State
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)

  const normalizedPhotos: MomentPhoto[] = useMemo(
    () => (config.photos || []).map((p, i) => normalizeMomentPhoto(p, i, config.photos?.length || 1)),
    [config.photos]
  )

  const selectedPhoto = normalizedPhotos.find(p => p.id === selectedPhotoId) || null

  const updatePhotoById = (id: string, updates: Partial<MomentPhoto>, pushHistory = true) => {
    const list = normalizedPhotos.map(p => {
      if (p.id === id) {
        return { ...p, ...updates }
      }
      return p
    })
    if (pushHistory) {
      updatePhotos(list)
    } else {
      useDesignStore.setState(state => ({
        config: { ...state.config, photos: list }
      }))
    }
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

  const handleOptimizeExistingPhotos = async () => {
    if (!normalizedPhotos.length || optimizingPhotos || photoUploading) return
    if (!window.confirm(`Tối ưu ${normalizedPhotos.length} ảnh hiện có? Ảnh gốc sẽ được giữ lại.`)) return

    setOptimizingPhotos(true)
    try {
      await optimizeExistingPhotos()
    } finally {
      setOptimizingPhotos(false)
    }
  }

  const handleRestoreOriginalPhotos = async () => {
    if (restoringOriginalPhotos || optimizingPhotos || photoUploading || normalizedPhotos.length !== 25) return
    if (!window.confirm('Khôi phục liên kết ảnh gốc cho 25 ảnh? Không xóa hay upload lại file nào.')) return

    setRestoringOriginalPhotos(true)
    try {
      await restoreOriginalPhotoLinks()
    } finally {
      setRestoringOriginalPhotos(false)
    }
  }

  const handleUpdatePhotoRatios = async () => {
    if (updatingPhotoRatios || optimizingPhotos || restoringOriginalPhotos || photoUploading || !normalizedPhotos.length) return
    setUpdatingPhotoRatios(true)
    try {
      await updateExistingPhotoRatios()
    } finally {
      setUpdatingPhotoRatios(false)
    }
  }

  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastAnalyzedUrl = useRef<string | null>(null)

  useEffect(() => {
    const url = config.music?.url
    if (url && url !== lastAnalyzedUrl.current) {
      lastAnalyzedUrl.current = url
      const audio = new Audio(url)
      audio.onloadedmetadata = () => {
        setMusicDuration(audio.duration)
        if (!config.music?.endTime || config.music.endTime === 0 || config.music.endTime > audio.duration) {
          updateMusic({ endTime: audio.duration }, false)
        }
      }
    } else if (!url && musicDuration !== 0) {
      lastAnalyzedUrl.current = null
      setMusicDuration(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.music?.url])
  const dragStartConfig = useRef(config)
  const hasMovedRef = useRef(false)

  useEffect(() => {
    fetchConfig()
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
      }
    }
  }, [fetchConfig])

  const playPreview = () => {
      if (!config.music?.url) return
      
      if (previewAudioRef.current) {
          previewAudioRef.current.pause()
      }
      
      const audio = new Audio(config.music.url)
      previewAudioRef.current = audio
      
      const start = config.music?.startTime || 0
      const end = config.music?.endTime || audio.duration
      
      audio.currentTime = start
      audio.play()
      setIsPlaying(true)
      
      const checkEnd = setInterval(() => {
          if (!previewAudioRef.current || previewAudioRef.current !== audio) {
              clearInterval(checkEnd)
              return
          }
          if (audio.currentTime >= end) {
              audio.pause()
              setIsPlaying(false)
              clearInterval(checkEnd)
          }
          if (audio.paused) {
              setIsPlaying(false)
              clearInterval(checkEnd)
          }
      }, 100)
  }

  const stopPreview = () => {
      if (previewAudioRef.current) {
          previewAudioRef.current.pause()
          previewAudioRef.current.currentTime = config.music?.startTime || 0
          setIsPlaying(false)
      }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!selectedElementId) return
        
        // Nudge with arrows
        const step = e.shiftKey ? 10 : 1
        let dx = 0
        let dy = 0
        
        if (e.key === 'ArrowLeft') dx = -step
        if (e.key === 'ArrowRight') dx = step
        if (e.key === 'ArrowUp') dy = -step
        if (e.key === 'ArrowDown') dy = step
        
        if (dx !== 0 || dy !== 0) {
            e.preventDefault()
            const el = config.elements.find(e => e.id === selectedElementId)
            if (el) {
                moveElement(selectedElementId, el.x + dx, el.y + dy)
            }
        }

        // Copy / Paste Shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault() // Prevent native copy
            useDesignStore.getState().copyElement()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault()
            useDesignStore.getState().pasteElement()
        }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElementId, config.elements, moveElement])

  const handleResizeStart = (e: React.MouseEvent, handle: string, el: DesignElement) => {
    e.stopPropagation()
    e.preventDefault()
    dragStartConfig.current = config
    hasMovedRef.current = false
    setIsResizing(true)

    const domEl = document.getElementById(el.id)
    const domRect = domEl?.getBoundingClientRect()
    const currentW = el.width || (domRect ? Math.round(domRect.width) : 100)
    const currentH = el.height || (domRect ? Math.round(domRect.height) : 100)

    resizeStateRef.current = {
      id: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startElX: el.x,
      startElY: el.y,
      startW: currentW,
      startH: currentH,
      aspectRatio: currentW / (currentH || 1),
    }
  }

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent, id: string, x: number, y: number) => {
    e.stopPropagation()
    // Snapshot config before drag starts
    dragStartConfig.current = config
    hasMovedRef.current = false
    
    selectElement(id)
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - x,
      y: e.clientY - y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // 0. Photo Collage Dragging — now handled inside PhotoCollageCanvas component
    // 1. Resizing
    if (isResizing && resizeStateRef.current) {
      hasMovedRef.current = true
      const state = resizeStateRef.current
      const deltaX = e.clientX - state.startX
      const deltaY = e.clientY - state.startY
      const keepRatio = !e.shiftKey // Default keep ratio for images, or Shift to freeform

      let newW = state.startW
      let newH = state.startH
      let newX = state.startElX
      let newY = state.startElY

      if (state.handle === 'se') {
        newW = Math.max(20, state.startW + deltaX)
        if (keepRatio) {
          newH = Math.max(20, Math.round(newW / state.aspectRatio))
        } else {
          newH = Math.max(20, state.startH + deltaY)
        }
      } else if (state.handle === 'sw') {
        const potentialW = Math.max(20, state.startW - deltaX)
        newW = potentialW
        newX = state.startElX + (state.startW - newW)
        if (keepRatio) {
          newH = Math.max(20, Math.round(newW / state.aspectRatio))
        } else {
          newH = Math.max(20, state.startH + deltaY)
        }
      } else if (state.handle === 'ne') {
        newW = Math.max(20, state.startW + deltaX)
        if (keepRatio) {
          newH = Math.max(20, Math.round(newW / state.aspectRatio))
          newY = state.startElY + (state.startH - newH)
        } else {
          newH = Math.max(20, state.startH - deltaY)
          newY = state.startElY + (state.startH - newH)
        }
      } else if (state.handle === 'nw') {
        newW = Math.max(20, state.startW - deltaX)
        newX = state.startElX + (state.startW - newW)
        if (keepRatio) {
          newH = Math.max(20, Math.round(newW / state.aspectRatio))
          newY = state.startElY + (state.startH - newH)
        } else {
          newH = Math.max(20, state.startH - deltaY)
          newY = state.startElY + (state.startH - newH)
        }
      }

      updateElement(state.id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      }, false)
      return
    }

    // 2. Dragging
    if (!isDragging || !selectedElementId) return
    
    hasMovedRef.current = true

    // Raw calculated position
    let newX = e.clientX - dragOffset.x
    let newY = e.clientY - dragOffset.y
    const SNAP_THRESHOLD = 5
    const newGuides: { type: 'horizontal' | 'vertical', pos: number }[] = []

    // Get dimensions of dragging element
    const dragEl = document.getElementById(selectedElementId)
    if (dragEl) {
        const rect = dragEl.getBoundingClientRect()
        const w = rect.width
        const h = rect.height
        
        // Calculate current centers/edges based on newX/newY (relative to canvas)
        // newX/newY are top/left relative to canvas
        const centerX = newX + w / 2
        const centerY = newY + h / 2
        
        // --- Snap Candidates ---
        const candidatesX = [config.width / 2] // Canvas center
        const candidatesY = [config.height / 2]
        
        // Other elements
        config.elements.forEach(other => {
            if (other.id === selectedElementId) return
            const otherEl = document.getElementById(other.id)
            if (otherEl) {
                const r = otherEl.getBoundingClientRect()
                const ow = r.width
                const oh = r.height
                
                candidatesX.push(other.x) // Left
                candidatesX.push(other.x + ow / 2) // Center
                candidatesX.push(other.x + ow) // Right
                
                candidatesY.push(other.y) // Top
                candidatesY.push(other.y + oh / 2) // Center
                candidatesY.push(other.y + oh) // Bottom
            }
        })
        
        // --- Apply X Snapping ---
        let snappedX = false
        
        // 1. Center to Candidates
        for (const cx of candidatesX) {
            if (Math.abs(centerX - cx) < SNAP_THRESHOLD) {
                newX = cx - w / 2
                newGuides.push({ type: 'vertical', pos: cx })
                snappedX = true
                break
            }
        }
        
        // 2. Left to Candidates (if not snapped center)
        if (!snappedX) {
             for (const cx of candidatesX) {
                if (Math.abs(newX - cx) < SNAP_THRESHOLD) {
                    newX = cx
                    newGuides.push({ type: 'vertical', pos: cx })
                    snappedX = true
                    break
                }
            }
        }
        
        // 3. Right to Candidates
         if (!snappedX) {
             for (const cx of candidatesX) {
                if (Math.abs((newX + w) - cx) < SNAP_THRESHOLD) {
                    newX = cx - w
                    newGuides.push({ type: 'vertical', pos: cx })
                    break
                }
            }
        }

        // --- Apply Y Snapping ---
        let snappedY = false
        // 1. Center
        for (const cy of candidatesY) {
            if (Math.abs(centerY - cy) < SNAP_THRESHOLD) {
                newY = cy - h / 2
                newGuides.push({ type: 'horizontal', pos: cy })
                snappedY = true
                break
            }
        }
        
        // 2. Top
        if (!snappedY) {
            for (const cy of candidatesY) {
                if (Math.abs(newY - cy) < SNAP_THRESHOLD) {
                    newY = cy
                    newGuides.push({ type: 'horizontal', pos: cy })
                    snappedY = true
                    break
                }
            }
        }

        // 3. Bottom
        if (!snappedY) {
            for (const cy of candidatesY) {
                if (Math.abs((newY + h) - cy) < SNAP_THRESHOLD) {
                    newY = cy - h
                    newGuides.push({ type: 'horizontal', pos: cy })
                    break
                }
            }
        }
    }
    
    // Axis Locking with Shift
    if (e.shiftKey) {
        setGuides([])
        const currentEl = config.elements.find(el => el.id === selectedElementId)
        if (currentEl) {
             const dx = Math.abs(newX - currentEl.x)
             const dy = Math.abs(newY - currentEl.y)
             if (dx > dy) newY = currentEl.y
             else newX = currentEl.x
        }
    } else {
        setGuides(newGuides)
    }
    
    moveElement(selectedElementId, newX, newY)
  }

  const handleMouseUp = () => {
    if ((isDragging || isResizing) && hasMovedRef.current) {
        pushStateToHistory(dragStartConfig.current)
    }
    setIsDragging(false)
    setIsResizing(false)
    resizeStateRef.current = null
    setGuides([])
  }

  // Icon Categories
  const ICON_CATEGORIES = {
      'Tình yêu & Cưới': ['❤️', '💍', '💐', '💒', '💌', '💕', '💑', '🕊️', '🌹', '✨'],
      'Tiệc tùng': ['🎂', '🎈', '🍾', '🥂', '🎁', '🕯️', '🎉', '🎊', '🎵', '🍰'],
      'Địa điểm & Chỉ dẫn': ['📍', '🗺️', '🏠', '⛪', '🚗', '✈️', '🅿️', '🕐', '📅', '📞'],
      'Biểu tượng khác': ['⭐', '🎓', '📸', '👗', '👔', '👠', '👑', '💎', '🦄', '🍀']
  }

  // Helper to add new text
  const addTextCheck = () => {
    addElement({
        id: `text_${Date.now()}`,
        type: 'text',
        content: 'New Text',
        x: 50,
        y: 50,
        style: { fontSize: '16px', color: '#000000', fontWeight: 'normal' }
    })
  }

  return (
    <>
      {/* Mobile Designer (Chế độ thiết kế nhanh & biên tập trực quan cho mobile) */}
      <div className="md:hidden">
        <MobileDesigner
          onOpenPreview={() => setShowPreview(true)}
          playPreview={playPreview}
          stopPreview={stopPreview}
          isPlaying={isPlaying}
          musicDuration={musicDuration}
          photoUploading={photoUploading}
          setPhotoUploading={setPhotoUploading}
        />
      </div>

      {/* Desktop Designer Canvas & Controls */}
      <div 
          className="hidden md:flex min-h-screen bg-slate-100 flex-row"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
      >
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-[40vh] md:h-screen md:sticky md:top-0 md:self-start z-10 shadow-lg">
         {/* Scrollable area */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-6">
                 <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap size={24} className="text-indigo-600" />
                    Thiết kế
                 </h1>
                 <div className="flex gap-2">
                     <button 
                        onClick={undo} 
                        disabled={past.length === 0}
                        className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
                        title="Hoàn tác"
                     >
                         <Undo size={16} />
                     </button>
                     <button 
                        onClick={redo} 
                        disabled={future.length === 0}
                        className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
                        title="Làm lại"
                     >
                         <Redo size={16} />
                     </button>
                 </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-100 mb-6">
                 <button 
                    onClick={() => setActiveTab('design')}
                    className={clsx(
                        "flex-1 py-3 text-[10px] font-bold transition-all border-b-2 tracking-widest",
                        activeTab === 'design' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                 >
                     THIẾT KẾ
                 </button>
                 <button 
                    onClick={() => setActiveTab('music')}
                    className={clsx(
                        "flex-1 py-3 text-[10px] font-bold transition-all border-b-2 tracking-widest",
                        activeTab === 'music' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                 >
                     NHẠC NỀN
                 </button>
                 <button 
                    onClick={() => setActiveTab('photos')}
                    className={clsx(
                        "flex-1 py-3 text-[10px] font-bold transition-all border-b-2 tracking-widest",
                        activeTab === 'photos' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                 >
                     KHOẢNH KHẮC
                 </button>
            </div>

            {activeTab === 'design' && (
                <div className="space-y-6">
                    {/* Add Elements Section */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thêm phần tử</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={addTextCheck} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 text-sm font-medium">
                                <Type size={16} /> Văn bản
                            </button>
                            
                            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 text-sm font-medium cursor-pointer">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            const reader = new FileReader()
                                            reader.onload = (ev) => {
                                                addElement({
                                                    id: `img_${Date.now()}`,
                                                    type: 'image',
                                                    content: ev.target?.result as string,
                                                    x: 100,
                                                    y: 100,
                                                    width: 150,
                                                    height: 150,
                                                    style: {}
                                                })
                                            }
                                            reader.readAsDataURL(file)
                                        }
                                    }}
                                />
                                <span className="flex items-center gap-2"><GraduationCap size={16} /> Ảnh</span>
                            </label>
                        </div>
                        <div className="mt-2">
                             <button
                                onClick={() => setShowIconPicker(true)}
                                className="w-full py-3 border border-dashed border-slate-300 rounded-lg text-slate-500 font-medium hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                             >
                                <Smile size={18} /> Mở thư viện Icon
                             </button>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Background Settings here */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phông nền</p>
                        <div className="flex gap-2">
                            <input 
                                type="color"
                                className="h-10 flex-1 p-0 border border-slate-200 rounded-lg cursor-pointer"
                                value={config.background.color}
                                onChange={(e) => updateBackground({ color: e.target.value })}
                            />
                            <label className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-sm" title="Đổi ảnh nền">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            const reader = new FileReader()
                                            reader.onload = (ev) => updateBackground({ image: ev.target?.result as string })
                                            reader.readAsDataURL(file)
                                        }
                                    }}
                                />
                                <Layers size={18} className="text-slate-600" />
                            </label>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {selectedElementId ? (
                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chỉnh sửa</p>
                                <div className="flex gap-2">
                                    <button onClick={() => useDesignStore.getState().copyElement()} className="text-xs text-indigo-600 font-bold hover:underline">Copy</button>
                                    <button onClick={() => useDesignStore.getState().pasteElement()} className="text-xs text-indigo-600 font-bold hover:underline">Paste</button>
                                    <button onClick={() => removeElement(selectedElementId)} className="text-red-500 text-xs hover:underline">Xóa</button>
                                </div>
                            </div>
                            
                            {(() => {
                                const el = config.elements.find(e => e.id === selectedElementId)
                                if (!el) return null
                                return (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => updateElement(el.id, { x: config.width / 2 - (el.width || 50) })}
                                                className="flex-1 p-2 bg-slate-100 rounded hover:bg-slate-200 text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5"
                                            >
                                                <AlignHorizontalJustifyCenter size={14} /> Căn ngang
                                            </button>
                                            <button 
                                                onClick={() => updateElement(el.id, { y: config.height / 2 - (el.height || 20) })}
                                                className="flex-1 p-2 bg-slate-100 rounded hover:bg-slate-200 text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5"
                                            >
                                                <AlignVerticalJustifyCenter size={14} /> Căn dọc
                                            </button>
                                        </div>

                                        <div className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Xoay</label>
                                                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2 bg-white">
                                                    <RotateCw size={14} className="text-slate-400" />
                                                    <input 
                                                        type="number"
                                                        className="w-full text-sm outline-none bg-transparent"
                                                        value={el.rotation || 0}
                                                        onChange={(e) => updateElement(el.id, { rotation: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-1 pt-4">
                                                <button onClick={() => sendToBack(el.id)} className="p-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100" title="Dưới cùng"><Layers size={14} className="rotate-180" /></button>
                                                <button onClick={() => bringToFront(el.id)} className="p-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100" title="Trên cùng"><Layers size={14} /></button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Vị trí X</label>
                                                <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={el.x} onChange={(e) => updateElement(el.id, { x: parseInt(e.target.value) || 0 })} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Vị trí Y</label>
                                                <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={el.y} onChange={(e) => updateElement(el.id, { y: parseInt(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Chiều rộng (W)</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="auto"
                                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm" 
                                                    value={el.width ?? ''} 
                                                    onChange={(e) => updateElement(el.id, { width: e.target.value === '' ? undefined : (parseInt(e.target.value) || 0) })} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Chiều cao (H)</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="auto"
                                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm" 
                                                    value={el.height ?? ''} 
                                                    onChange={(e) => updateElement(el.id, { height: e.target.value === '' ? undefined : (parseInt(e.target.value) || 0) })} 
                                                />
                                            </div>
                                        </div>

                                        {(el.type === 'text' || el.type === 'button' || el.type === 'dynamic') && (
                                            <div className="space-y-4">
                                                {el.type !== 'dynamic' && (
                                                    <div>
                                                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Nội dung</label>
                                                        <textarea className="w-full border border-slate-200 rounded-lg p-2.5 text-sm min-h-[80px] focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all" value={el.content || ''} onChange={(e) => updateElement(el.id, { content: e.target.value })} />
                                                    </div>
                                                )}
                                                {el.type === 'text' && (
                                                    <div>
                                                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Tọa độ bản đồ (tùy chọn)</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                                                                placeholder="Lat (VD: 10.86889)"
                                                                value={el.mapLat ?? ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(',', '.')
                                                                    // Allow typing digits, dot, and leading minus
                                                                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                                                        updateElement(el.id, { mapLat: val === '' ? undefined : val })
                                                                    }
                                                                }}
                                                            />
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                                                                placeholder="Lng (VD: 106.80118)"
                                                                value={el.mapLng ?? ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(',', '.')
                                                                    // Allow typing digits, dot, and leading minus
                                                                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                                                        updateElement(el.id, { mapLng: val === '' ? undefined : val })
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-1">Khách mời có thể bấm vào địa chỉ để xem bản đồ</p>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Cỡ chữ</label>
                                                        <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={parseInt(el.style.fontSize as string) || 16} onChange={(e) => updateElement(el.id, { style: { ...el.style, fontSize: `${e.target.value}px` } })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Màu chữ</label>
                                                        <input type="color" className="w-full h-[38px] p-1 border border-slate-200 rounded-lg cursor-pointer" value={el.style.color as string || '#000000'} onChange={(e) => updateElement(el.id, { style: { ...el.style, color: e.target.value } })} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Font chữ</label>
                                                    <select 
                                                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10" 
                                                        value={el.style.fontFamily || 'sans-serif'} 
                                                        onChange={(e) => updateElement(el.id, { style: { ...el.style, fontFamily: e.target.value } })}
                                                        style={{ fontFamily: el.style.fontFamily }}
                                                    >
                                                        {FONTS.map(f => (
                                                            <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                                                                {f.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>
                    ) : (
                        <div className="text-slate-400 text-xs text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Chọn một phần tử để bắt đầu chỉnh sửa
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'music' && (
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Music size={14} className="text-indigo-600" /> Cấu hình nhạc
                            </label>
                        </div>
                        <div className="space-y-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tải nhạc từ máy (MP3)</label>
                                    <label className={clsx(
                                        "w-full py-6 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all group relative overflow-hidden",
                                        config.music?.url ? "bg-emerald-50 border-emerald-200" : "bg-slate-100/50 border-slate-200 hover:bg-white hover:border-indigo-400"
                                    )} title="Tải nhạc từ máy">
                                        <input 
                                            type="file"
                                            accept="audio/mpeg,audio/wav,audio/mp3"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    const url = await uploadFile(file)
                                                    if (url) {
                                                        updateMusic({ url, enabled: true })
                                                        // Explicitly save the config to ensure persistence across refreshes
                                                        setTimeout(async () => {
                                                            const success = await saveConfig()
                                                            if (success) {
                                                                console.log('Auto-saved music configuration')
                                                            }
                                                        }, 500)
                                                    }
                                                }
                                            }}
                                        />
                                        {config.music?.url ? (
                                            <>
                                                <div className="p-3 bg-white rounded-full shadow-sm mb-2 text-emerald-600 group-hover:scale-110 transition-transform">
                                                    <Music size={20} />
                                                </div>
                                                <span className="text-xs font-bold text-emerald-700">Đã chọn bài nhạc</span>
                                                <span className="text-[9px] text-emerald-600/70 mt-1 font-medium bg-emerald-100/50 px-2 py-0.5 rounded-full max-w-[85%] truncate">
                                                    {config.music.url.split('/').pop()}
                                                </span>
                                                <div className="absolute top-2 right-2 p-1 bg-emerald-500 text-white rounded-full shadow-sm">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                                    <ArrowUp size={20} className="text-indigo-600" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">Nhấn để chọn file nhạc</span>
                                                <span className="text-[10px] text-slate-400 mt-1">Định dạng hỗ trợ: .mp3, .wav</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            
                            {musicDuration > 0 ? (
                                <div className="space-y-4 py-2 border-t border-slate-200/50 mt-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-bold text-slate-400">0s</span>
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <label className="block text-[9px] text-slate-400 uppercase font-bold">Bắt đầu</label>
                                                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{Math.floor(config.music?.startTime || 0)}s</span>
                                            </div>
                                            <div className="text-center">
                                                <label className="block text-[9px] text-slate-400 uppercase font-bold">Kết thúc</label>
                                                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{Math.floor(config.music?.endTime || musicDuration)}s</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{Math.floor(musicDuration)}s</span>
                                    </div>
                                    
                                    <div className="relative h-6 flex items-center bg-slate-200/50 rounded-full px-2">
                                        <div className="absolute left-2 right-2 h-2 bg-slate-300 rounded-full" />
                                        <div 
                                            className="absolute h-2 bg-indigo-500 rounded-full z-10"
                                            style={{
                                                left: `calc(8px + ${(config.music?.startTime || 0) / musicDuration * (100)}% - ${((config.music?.startTime || 0) / musicDuration) * 16}px)`,
                                                width: `calc(${((config.music?.endTime || musicDuration) - (config.music?.startTime || 0)) / musicDuration * 100}% - ${((config.music?.endTime || musicDuration) - (config.music?.startTime || 0)) / musicDuration * 16}px)`
                                            }}
                                        />
                                        <input 
                                            type="range"
                                            min={0}
                                            max={musicDuration}
                                            step={0.1}
                                            value={config.music?.startTime || 0}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value)
                                                const end = config.music?.endTime || musicDuration
                                                updateMusic({ startTime: Math.min(val, end - 1) }, false)
                                            }}
                                            onMouseUp={() => {
                                                const start = config.music?.startTime || 0
                                                updateMusic({ startTime: start }, true)
                                            }}
                                            className="absolute left-2 right-2 w-[calc(100%-16px)] h-2 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                                        />
                                        <input 
                                            type="range"
                                            min={0}
                                            max={musicDuration}
                                            step={0.1}
                                            value={config.music?.endTime || musicDuration}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value)
                                                const start = config.music?.startTime || 0
                                                updateMusic({ endTime: Math.max(val, start + 1) }, false)
                                            }}
                                            onMouseUp={() => {
                                                const end = config.music?.endTime || musicDuration
                                                updateMusic({ endTime: end }, true)
                                            }}
                                            className="absolute left-2 right-2 w-[calc(100%-16px)] h-2 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                                        />
                                    </div>
                                </div>
                            ) : config.music?.url ? (
                                <div className="py-6 text-center border-t border-slate-100">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto" />
                                    <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wider">Phân tích âm thanh...</p>
                                </div>
                            ) : (
                                <div className="py-8 text-center border-t border-slate-100/50">
                                    <div className="p-3 bg-indigo-50 rounded-full w-fit mx-auto mb-3">
                                        <Music size={24} className="text-indigo-300" />
                                    </div>
                                    <p className="text-xs text-slate-400 px-4 leading-relaxed">Tải lên nhạc để bắt đầu thiết kế khoảng phát tự động</p>
                                </div>
                            )}

                             <div className="flex gap-2">
                                <button 
                                    onClick={isPlaying ? stopPreview : playPreview}
                                    disabled={!config.music?.url}
                                    className={clsx(
                                        "flex-1 py-3 text-white shadow-lg rounded-xl disabled:opacity-30 disabled:shadow-none text-sm font-bold flex items-center justify-center gap-2 transition-all",
                                        isPlaying ? "bg-red-500 hover:bg-red-600 shadow-red-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                                    )}
                                >
                                    {isPlaying ? (
                                        <><div className="w-2 h-2 bg-white rounded-full animate-pulse" /> Dừng phát</>
                                    ) : (
                                        <><Volume2 size={18} /> Nghe thử</>
                                    )}
                                </button>
                             </div>
                        </div>
                    </div>
                </div>
            )}

             {/* ── Photos tab ── */}
             {activeTab === 'photos' && (
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <Images size={14} className="text-indigo-600" /> Bảng thiết kế ảnh khoảnh khắc
                        </p>
                        <p className="text-[10px] text-slate-400">
                            Tự do kéo vị trí, xoay góc ngang/dọc, và sắp xếp ảnh đè lên nhau như scrapbook.
                        </p>
                    </div>

                    {/* Layout switcher */}
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
                            <Grid size={13} /> Dạng lưới (Grid)
                        </button>
                    </div>

                    {/* Upload button */}
                    <label className={clsx(
                        "w-full py-4 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all group",
                        photoUploading ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400"
                    )}>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={photoUploading}
                            onChange={async (e) => {
                                const files = Array.from(e.target.files || [])
                                if (!files.length) return
                                setPhotoUploading(true)
                                const uploadedPhotos: { url: string; aspectRatio?: number }[] = []
                                for (const file of files) {
                                    const aspectRatio = await getImageAspectRatio(file)
                                    const url = await uploadFile(file)
                                    if (url) uploadedPhotos.push({ url, aspectRatio })
                                }
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
                                setPhotoUploading(false)
                                e.target.value = ''
                            }}
                        />
                        {photoUploading ? (
                            <span className="text-sm text-indigo-500 font-medium animate-pulse">Đang tải lên…</span>
                        ) : (
                            <>
                                <Plus size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors mb-0.5" />
                                <span className="text-xs text-slate-600 group-hover:text-indigo-600 transition-colors font-medium">+ Thêm ảnh mới</span>
                                <span className="text-[9px] text-slate-400">Chọn nhiều ảnh cùng lúc</span>
                            </>
                        )}
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
                        {optimizingPhotos ? 'Đang tối ưu ảnh…' : `Tối ưu ${normalizedPhotos.length} ảnh hiện có`}
                    </button>

                    <button
                        type="button"
                        onClick={handleRestoreOriginalPhotos}
                        disabled={restoringOriginalPhotos || optimizingPhotos || photoUploading || normalizedPhotos.length !== 25}
                        className="w-full py-2.5 px-3 flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {restoringOriginalPhotos ? 'Đang khôi phục liên kết…' : 'Khôi phục liên kết ảnh gốc'}
                    </button>

                    <button
                        type="button"
                        onClick={handleUpdatePhotoRatios}
                        disabled={updatingPhotoRatios || optimizingPhotos || restoringOriginalPhotos || photoUploading || !normalizedPhotos.length}
                        className="w-full py-2.5 px-3 flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {updatingPhotoRatios ? 'Đang đọc tỷ lệ ảnh…' : 'Cập nhật tỷ lệ ảnh cũ'}
                    </button>
                    </>
                    )}

                    {/* Selected Photo Inspector */}
                    {selectedPhoto ? (
                        <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3.5 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                                <div className="flex items-center gap-2">
                                    <img src={selectedPhoto.url} alt="Ảnh chọn" className="w-8 h-8 rounded object-cover border border-indigo-200" />
                                    <div>
                                        <p className="text-xs font-bold text-indigo-900">Tùy chỉnh ảnh đang chọn</p>
                                        <p className="text-[10px] text-indigo-600">Lớp đè: #{selectedPhoto.zIndex} · Góc: {selectedPhoto.rotation || 0}°</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPhotoId(null)}
                                    className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                    Đóng
                                </button>
                            </div>

                            {/* Rotation */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                    <span>Xoay ảnh:</span>
                                    <span className="font-mono text-indigo-600">{selectedPhoto.rotation || 0}°</span>
                                </div>
                                <div className="grid grid-cols-5 gap-1 mb-2">
                                    <button
                                        type="button"
                                        title="Xoay ngang trái 90°"
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
                                        title="Xoay ngang phải 90°"
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

                            {/* Overlapping & Layering */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                    <span>Thứ tự đè lớp (Ảnh đè lên nhau):</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Tầng #{selectedPhoto.zIndex}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => bringPhotoToFront(selectedPhoto.id)}
                                        className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors"
                                    >
                                        <Layers size={13} /> Lên trên cùng
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => sendPhotoToBack(selectedPhoto.id)}
                                        className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors"
                                    >
                                        <Layers size={13} className="rotate-180" /> Xuống dưới cùng
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                    <button
                                        type="button"
                                        onClick={() => stepPhotoLayer(selectedPhoto.id, 1)}
                                        className="py-1 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[11px] rounded flex items-center justify-center gap-1"
                                    >
                                        +1 Lớp (Lên 1 bậc)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => stepPhotoLayer(selectedPhoto.id, -1)}
                                        className="py-1 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[11px] rounded flex items-center justify-center gap-1"
                                    >
                                        -1 Lớp (Xuống 1 bậc)
                                    </button>
                                </div>
                            </div>

                            {/* Size / Width */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                    <span>Kích thước ảnh:</span>
                                    <span className="font-mono text-indigo-600">{selectedPhoto.width}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="110"
                                    max="320"
                                    step="5"
                                    value={selectedPhoto.width}
                                    onChange={(e) => updatePhotoById(selectedPhoto.id, { width: parseInt(e.target.value) || 175 })}
                                    className="w-full accent-indigo-600"
                                />
                            </div>

                            {/* Frame style */}
                            <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1.5">Kiểu khung ảnh:</p>
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

                            {/* Delete this photo */}
                            <button
                                type="button"
                                onClick={() => {
                                    const updated = normalizedPhotos.filter(p => p.id !== selectedPhoto.id)
                                    updatePhotos(updated)
                                    setSelectedPhotoId(null)
                                }}
                                className="w-full py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 transition-colors font-medium border border-red-200"
                            >
                                <Trash2 size={13} /> Xóa ảnh này
                            </button>
                        </div>
                    ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                            <p className="text-xs text-slate-500 font-medium">Nhấp vào một ảnh trên bảng để tùy chỉnh</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Xoay ngang/dọc, góc nghiêng, kích thước và thứ tự đè lớp</p>
                        </div>
                    )}

                    {/* Photo List Thumbnails */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            <span>Danh sách ảnh ({normalizedPhotos.length})</span>
                            <button
                                type="button"
                                onClick={autoArrangePhotos}
                                className="text-[10px] text-indigo-600 hover:underline normal-case font-medium flex items-center gap-0.5"
                            >
                                <Sparkles size={11} /> Tự động xếp
                            </button>
                        </div>

                        {normalizedPhotos.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {normalizedPhotos.map((photo, i) => {
                                    const isSelected = selectedPhotoId === photo.id
                                    return (
                                        <div
                                            key={photo.id || photo.url + i}
                                            onClick={() => setSelectedPhotoId(photo.id)}
                                            className={clsx(
                                                "relative group aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all",
                                                isSelected ? "ring-2 ring-indigo-600 border-indigo-600 shadow-sm" : "border-slate-200 hover:border-indigo-300"
                                            )}
                                        >
                                            <img
                                                src={photo.url}
                                                alt={`Ảnh ${i + 1}`}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.2 rounded text-[9px] font-mono">
                                                #{i + 1}
                                            </div>
                                            <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-amber-300 px-1 py-0.2 rounded text-[8px] font-mono">
                                                {photo.rotation || 0}°
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-xs text-slate-400 py-3">Chưa có ảnh nào. Tải lên để bắt đầu.</p>
                        )}
                    </div>
                </div>
             )}
          </div>

          {/* Fixed bottom bar */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
             <div className="flex gap-2">
                 <button
                     onClick={() => setShowPreview(true)}
                     className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                 >
                     <Eye size={17} /> Xem trước
                 </button>
                 <button 
                     onClick={() => saveConfig()}
                     className="flex-1 py-3 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                 >
                     {loading ? 'Đang lưu...' : <><Save size={17} /> Lưu</>}
                 </button>
             </div>
          </div>
      </div>

      {/* Main Sandbox Area */}
      <div 
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 flex flex-col items-center justify-start p-8 bg-slate-100 overflow-auto relative"
      >
        {activeTab === 'photos' ? (
          /* Khoảnh Khắc Collage Canvas — rendered by isolated component for performance */
          <PhotoCollageCanvas />
        ) : (
          /* Main Card Canvas */
          <div 
             ref={canvasRef}
             className="relative shadow-2xl ring-1 ring-slate-900/5 my-auto"
             style={{ width: config.width, height: config.height }}
          >
              <div 
                 className="w-full h-full relative overflow-hidden bg-white"
                 style={{
                     backgroundColor: config.background.color,
                     backgroundImage: config.background.image ? `url(${normalizeUrl(config.background.image)})` : undefined,
                 }}
                 onClick={() => selectElement(null)}
              >
                  {/* Guides */}
                  {guides.map((g, i) => (
                     <div 
                         key={i}
                         className="absolute bg-pink-500 z-[60] pointer-events-none"
                         style={{
                             left: g.type === 'vertical' ? g.pos : 0,
                             top: g.type === 'horizontal' ? g.pos : 0,
                             width: g.type === 'vertical' ? '1px' : '100%',
                             height: g.type === 'horizontal' ? '1px' : '100%',
                             boxShadow: '0 0 2px rgba(255,255,255,0.5)'
                         }}
                     />
                  ))}

                  {config.elements.map(el => (
                     <div
                         key={el.id}
                         id={el.id}
                         onClick={(e) => e.stopPropagation()}
                         onMouseDown={(e) => handleMouseDown(e, el.id, el.x, el.y)}
                         className={clsx(
                             "absolute cursor-move select-none whitespace-pre-wrap hover:ring-1 hover:ring-blue-400",
                             selectedElementId === el.id && "ring-2 ring-blue-600 z-50",
                             el.type === 'button' && "flex items-center justify-center font-bold shadow-lg rounded-xl"
                         )}
                         style={{
                             left: el.x,
                             top: el.y,
                             width: el.width,
                             height: el.height,
                             ...el.style,
                             ...(el.type === 'button' ? {
                                 backgroundColor: el.style.backgroundColor || '#064e3b',
                                 color: el.style.color || '#ffffff',
                             } : {}),
                             fontSize: el.style.fontSize,
                             transform: `rotate(${el.rotation || 0}deg)`
                         }}
                     >
                         {el.type !== 'image' && hasMapLocation(el) && (
                             <span className="relative -top-0.5 inline-flex items-center align-middle mr-1.5">
                                 <MapPin size={13} className="shrink-0 text-[#fcd34d]/70" />
                             </span>
                         )}
                         {el.type === 'dynamic' && el.field === 'full_name' ? '{Tên Khách Mời}' : (
                             el.type === 'image' ? (
                                 normalizeUrl(el.content) ? (
                                     <img src={normalizeUrl(el.content)} className="w-full h-full object-cover pointer-events-none" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[10px] text-slate-400">No Image</div>
                                 )
                             ) : el.content
                         )}

                         {/* Resize Handles when element is selected */}
                         {selectedElementId === el.id && (
                             <>
                                 <div
                                     onMouseDown={(e) => handleResizeStart(e, 'nw', el)}
                                     className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-10 shadow-sm hover:scale-125 transition-transform"
                                 />
                                 <div
                                     onMouseDown={(e) => handleResizeStart(e, 'ne', el)}
                                     className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-10 shadow-sm hover:scale-125 transition-transform"
                                 />
                                 <div
                                     onMouseDown={(e) => handleResizeStart(e, 'sw', el)}
                                     className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-10 shadow-sm hover:scale-125 transition-transform"
                                 />
                                 <div
                                     onMouseDown={(e) => handleResizeStart(e, 'se', el)}
                                     className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-10 shadow-sm hover:scale-125 transition-transform"
                                 />
                             </>
                         )}
                     </div>
                  ))}
              </div>
          </div>
        )}
         
        {activeTab !== 'photos' && (
          <div className="absolute bottom-4 right-4 text-xs text-slate-400">
             Kích thước: {config.width} x {config.height} px
          </div>
        )}
      </div>


       {/* Icon Picker Modal */}
       {showIconPicker && (
           <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                   <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                       <h3 className="font-bold text-lg text-slate-800">Chọn Thư viện Icon</h3>
                       <button onClick={() => setShowIconPicker(false)} className="text-slate-400 hover:text-red-500 text-2xl">&times;</button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-4 space-y-6">
                       {Object.entries(ICON_CATEGORIES).map(([category, icons]) => (
                           <div key={category}>
                               <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 text-xs">{category}</h4>
                               <div className="grid grid-cols-6 gap-2">
                                   {icons.map(icon => (
                                       <button 
                                           key={icon}
                                           onClick={() => {
                                               addElement({
                                                   id: `icon_${Date.now()}`,
                                                   type: 'text',
                                                   content: icon,
                                                   x: config.width / 2 - 20,
                                                   y: config.height / 2 - 20,
                                                   style: { fontSize: '40px' }
                                               })
                                               setShowIconPicker(false)
                                           }}
                                           className="aspect-square flex items-center justify-center text-3xl hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                       >
                                           {icon}
                                       </button>
                                   ))}
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           </div>
       )}

      </div>

      {/* Preview Modal (dùng chung cho cả desktop và mobile) */}
      {showPreview && (
          <PreviewModal onClose={() => setShowPreview(false)} />
      )}
    </>
  )
}

function PreviewModal({ onClose }: { onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex items-center justify-between w-full px-4 sm:px-6 py-3 bg-black/60">
        <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
          <Eye size={16} />
          <span className="font-medium">Xem trước — hiển thị giống khách mời</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-xs sm:text-sm font-bold"
        >
          <X size={16} /> Đóng
        </button>
      </div>

      {/* iframe */}
      <iframe
        src="/invitation"
        className="flex-1 w-full border-0"
        title="Invitation Preview"
      />
    </div>
  )
}
