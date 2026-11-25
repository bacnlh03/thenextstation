import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDesignStore } from '@/stores/useDesignStore'
import { normalizeMomentPhoto } from '@/types/design'
import type { MomentPhoto } from '@/types/design'
import { Layers, Trash2, Sparkles, Images } from 'lucide-react'
import clsx from 'clsx'

/**
 * PhotoCollageCanvas — fully self-contained collage editor.
 * All drag/resize state is local → zero re-renders on the parent while dragging.
 */
export function PhotoCollageCanvas() {
  const { config, updatePhotos } = useDesignStore()

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const [canvasScale, setCanvasScale] = useState(1)

  // Drag state — all in refs, never causes re-render during drag
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragPhotoIdRef = useRef<string | null>(null)
  const dragStartPhotosRef = useRef<MomentPhoto[]>([])
  const hasDragMovedRef = useRef(false)
  const interactionRef = useRef<{
    type: 'resize' | 'rotate'
    pointerId: number
    photo: MomentPhoto
    startX: number
    startY: number
    centerX: number
    centerY: number
    startAngle: number
  } | null>(null)

  const normalizedPhotos = useMemo(
    () => (config.photos || []).map((p, i) => normalizeMomentPhoto(p, i, config.photos?.length || 1)),
    [config.photos]
  )

  const selectedPhoto = useMemo(
    () => normalizedPhotos.find(p => p.id === selectedPhotoId) ?? null,
    [normalizedPhotos, selectedPhotoId]
  )

  // Canvas height derived from photo positions
  const canvasHeight = useMemo(() => {
    if (normalizedPhotos.length === 0) return 520
    return Math.max(...normalizedPhotos.map(p => p.y + (p.height || p.width / (p.aspectRatio || 0.8))), 520) + 80
  }, [normalizedPhotos])

  const canvasDesignWidth = useMemo(
    () => normalizedPhotos.reduce((max, photo) => Math.max(max, photo.x + photo.width + 24), 400),
    [normalizedPhotos]
  )

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const updatePhoto = useCallback((id: string, updates: Partial<MomentPhoto>) => {
    const list = useDesignStore.getState().config.photos || []
    const normalized = list.map((p, i) => normalizeMomentPhoto(p, i, list.length))
    const updated = normalized.map(p => p.id === id ? { ...p, ...updates } : p)
    updatePhotos(updated)
  }, [updatePhotos])

  const autoArrange = useCallback(() => {
    const arranged = normalizedPhotos.map((p, index) => ({
      ...p,
      x: index % 2 === 0 ? 25 + (index % 3) * 8 : 185 - (index % 3) * 8,
      y: 20 + index * 125,
      rotation: index % 2 === 0 ? -7 + ((index * 3) % 9) : 5 - ((index * 2) % 7),
      zIndex: index + 1,
    }))
    updatePhotos(arranged)
  }, [normalizedPhotos, updatePhotos])

  const bringToFront = useCallback((id: string) => {
    const max = Math.max(...normalizedPhotos.map(p => p.zIndex || 1), 1)
    updatePhoto(id, { zIndex: max + 1 })
  }, [normalizedPhotos, updatePhoto])

  const sendToBack = useCallback((id: string) => {
    const min = Math.min(...normalizedPhotos.map(p => p.zIndex || 1), 1)
    updatePhoto(id, { zIndex: Math.max(1, min - 1) })
  }, [normalizedPhotos, updatePhoto])

  const deletePhoto = useCallback((id: string) => {
    const updated = normalizedPhotos.filter(p => p.id !== id)
    updatePhotos(updated)
    setSelectedPhotoId(null)
  }, [normalizedPhotos, updatePhotos])

  // ─── Drag handlers (no setState during drag) ──────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent, photo: MomentPhoto) => {
    e.stopPropagation()
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const point = getCanvasPoint(e, rect)
    isDraggingRef.current = true
    hasDragMovedRef.current = false
    dragPhotoIdRef.current = photo.id
    dragOffsetRef.current = {
      x: point.x - photo.x,
      y: point.y - photo.y,
    }
    dragStartPhotosRef.current = normalizedPhotos
    setSelectedPhotoId(photo.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [canvasScale, normalizedPhotos])

  const handleResizeStart = useCallback((e: React.PointerEvent, photo: MomentPhoto) => {
    e.stopPropagation()
    interactionRef.current = {
      type: 'resize',
      pointerId: e.pointerId,
      photo,
      startX: e.clientX,
      startY: e.clientY,
      centerX: 0,
      centerY: 0,
      startAngle: 0,
    }
    setSelectedPhotoId(photo.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handleRotateStart = useCallback((e: React.PointerEvent, photo: MomentPhoto) => {
    e.stopPropagation()
    const element = document.getElementById(photo.id)
    const rect = element?.getBoundingClientRect()
    if (!rect) return
    interactionRef.current = {
      type: 'rotate',
      pointerId: e.pointerId,
      photo,
      startX: e.clientX,
      startY: e.clientY,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      startAngle: Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)),
    }
    setSelectedPhotoId(photo.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const interaction = interactionRef.current
    if (interaction && interaction.pointerId === e.pointerId) {
      const element = document.getElementById(interaction.photo.id)
      if (!element) return
      if (interaction.type === 'resize') {
        const delta = ((e.clientX - interaction.startX) + (e.clientY - interaction.startY)) / (2 * canvasScale)
        const width = Math.min(320, Math.max(110, Math.round(interaction.photo.width + delta)))
        element.style.width = `${width}px`
      } else {
        const angle = Math.atan2(e.clientY - interaction.centerY, e.clientX - interaction.centerX)
        const rotation = interaction.photo.rotation + ((angle - interaction.startAngle) * 180) / Math.PI
        element.style.transform = `rotate(${rotation}deg)`
      }
      return
    }
    if (!isDraggingRef.current || !dragPhotoIdRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const point = getCanvasPoint(e, rect)
    const el = document.getElementById(dragPhotoIdRef.current)
    const elW = el ? el.offsetWidth : 0
    const elH = el ? el.offsetHeight : 0
    // Clamp within canvas bounds
    const x = Math.min(canvasDesignWidth - elW, Math.max(0, Math.round(point.x - dragOffsetRef.current.x)))
    const y = Math.min(canvasHeight - elH, Math.max(0, Math.round(point.y - dragOffsetRef.current.y)))
    hasDragMovedRef.current = true
    // Move DOM element directly — no React state, no re-render
    if (el) {
      el.style.left = `${x}px`
      el.style.top = `${y}px`
    }
  }, [canvasDesignWidth, canvasHeight, canvasScale])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const interaction = interactionRef.current
    if (interaction && interaction.pointerId === e.pointerId) {
      const element = document.getElementById(interaction.photo.id)
      if (element) {
        if (interaction.type === 'resize') {
          const delta = ((e.clientX - interaction.startX) + (e.clientY - interaction.startY)) / (2 * canvasScale)
          updatePhoto(interaction.photo.id, {
            width: Math.min(320, Math.max(110, Math.round(interaction.photo.width + delta))),
          })
        } else {
          const angle = Math.atan2(e.clientY - interaction.centerY, e.clientX - interaction.centerX)
          updatePhoto(interaction.photo.id, {
            rotation: interaction.photo.rotation + ((angle - interaction.startAngle) * 180) / Math.PI,
          })
        }
      }
      interactionRef.current = null
      return
    }
    if (!isDraggingRef.current || !dragPhotoIdRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const point = getCanvasPoint(e, rect)
    const el = document.getElementById(dragPhotoIdRef.current)
    const elW = el ? el.offsetWidth : 0
    const elH = el ? el.offsetHeight : 0
    const x = Math.min(canvasDesignWidth - elW, Math.max(0, Math.round(point.x - dragOffsetRef.current.x)))
    const y = Math.min(canvasHeight - elH, Math.max(0, Math.round(point.y - dragOffsetRef.current.y)))
    // Commit final position to store once
    const id = dragPhotoIdRef.current
    if (hasDragMovedRef.current) {
      const list = dragStartPhotosRef.current.map(p => p.id === id ? { ...p, x, y } : p)
      updatePhotos(list)
    }
    isDraggingRef.current = false
    dragPhotoIdRef.current = null
    hasDragMovedRef.current = false
  }, [canvasDesignWidth, canvasHeight, canvasScale, updatePhoto, updatePhotos])

  useEffect(() => {
    const host = canvasHostRef.current
    if (!host) return
    const updateScale = () => setCanvasScale(Math.min(1, host.clientWidth / canvasDesignWidth))
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(host)
    return () => observer.disconnect()
  }, [canvasDesignWidth])

  const getCanvasPoint = (event: React.PointerEvent, rect: DOMRect) => ({
    x: (event.clientX - rect.left) / canvasScale,
    y: (event.clientY - rect.top) / canvasScale,
  })

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col items-center gap-4 w-full max-w-[500px]"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Toolbar */}
      <div className="bg-white px-4 py-2.5 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between gap-3 w-full overflow-x-auto">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
          <Sparkles size={15} className="text-amber-500" />
          <span>Bảng thiết kế Khoảnh Khắc</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={autoArrange}
            className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Sparkles size={11} /> Xếp tự động
          </button>
          {selectedPhotoId && (
            <>
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2 shrink-0">
                {(['polaroid', 'gold', 'borderless'] as const).map(frame => (
                  <button
                    key={frame}
                    type="button"
                    onClick={() => selectedPhoto && updatePhoto(selectedPhoto.id, { frame })}
                    className={clsx(
                      'px-1.5 py-1 text-[10px] rounded border',
                      selectedPhoto?.frame === frame
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                    )}
                    title={`Khung ${frame}`}
                  >
                    {frame === 'polaroid' ? 'Ảnh' : frame === 'gold' ? 'Vàng' : 'Trơn'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoId(null)}
                className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                Bỏ chọn
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas — overflow:visible so floating toolbars above photos are not clipped */}
      <div ref={canvasHostRef} className="relative w-full min-w-0 overflow-visible">
      <div
        className="relative mx-auto"
        style={{ width: canvasDesignWidth * canvasScale, height: canvasHeight * canvasScale }}
      >
      <div
        ref={canvasRef}
        onClick={() => setSelectedPhotoId(null)}
        className="relative shadow-2xl rounded-2xl select-none w-full"
        style={{
          width: canvasDesignWidth,
          height: canvasHeight,
          transform: `translateX(-50%) scale(${canvasScale})`,
          transformOrigin: 'top center',
          left: '50%',
          backgroundColor: '#1e1b4b',
          backgroundImage: 'url(https://www.transparenttextures.com/patterns/stardust.png)',
          outline: '1px solid #1e293b', // border without overflow-hidden
          overflow: 'visible',
          touchAction: 'none',
        }}
      >
        {/* Photos */}
        {normalizedPhotos.map((photo, i) => {
          const isSelected = selectedPhotoId === photo.id
          const isPolaroid = photo.frame === 'polaroid'
          const isGold = photo.frame === 'gold'
          const isLandscape = photo.orientation === 'landscape'

          return (
            <div
              key={photo.id || photo.url + i}
              id={photo.id}
              onClick={e => { e.stopPropagation(); setSelectedPhotoId(photo.id) }}
              onPointerDown={e => handlePointerDown(e, photo)}
              className={clsx(
                'absolute cursor-move select-none group',
                isSelected && 'ring-2 ring-indigo-500 shadow-2xl',
                !isSelected && 'hover:ring-1 hover:ring-indigo-300/80',
                isPolaroid && 'bg-[#fffefb] p-2 pb-5 rounded-xs shadow-[0_12px_28px_rgba(0,0,0,0.55)] ring-1 ring-black/10',
                isGold && 'p-1.5 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-[0_12px_28px_rgba(0,0,0,0.55)]',
                !isPolaroid && !isGold && 'rounded-xl overflow-hidden shadow-[0_12px_28px_rgba(0,0,0,0.55)] border border-white/10',
              )}
              style={{
                left: photo.x,
                top: photo.y,
                width: photo.width,
                transform: `rotate(${photo.rotation}deg)`,
                zIndex: photo.zIndex || i + 1,
                willChange: 'left, top',
              }}
            >
              {/* Floating controls */}
              {isSelected && (
                <div
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                    className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-full text-white shadow-2xl whitespace-nowrap text-[10px]"
                >
                  <button type="button" title="Lên trên cùng"
                    onClick={() => bringToFront(photo.id)}
                    className="px-1.5 py-0.5 hover:bg-white/20 rounded text-[9px] font-medium"
                  >Lên trên</button>
                  <button type="button" title="Xuống dưới cùng"
                    onClick={() => sendToBack(photo.id)}
                    className="px-1.5 py-0.5 hover:bg-white/20 rounded text-[9px] font-medium"
                  >Xuống dưới</button>
                  <div className="w-px h-3 bg-white/20 mx-0.5" />
                  <button type="button" title="Xóa ảnh"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => deletePhoto(photo.id)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-full"
                  ><Trash2 size={11} /></button>
                </div>
              )}

              {isSelected && (
                <>
                  <button
                    type="button"
                    aria-label="Xoay ảnh"
                    onPointerDown={e => handleRotateStart(e, photo)}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 h-5 w-5 rounded-full bg-indigo-600 text-white text-[11px] shadow-lg cursor-grab active:cursor-grabbing"
                  >
                    ↻
                  </button>
                  <button
                    type="button"
                    aria-label="Đổi kích thước ảnh"
                    onPointerDown={e => handleResizeStart(e, photo)}
                    className="absolute -bottom-2 -right-2 z-50 h-5 w-5 rounded-sm border-2 border-white bg-indigo-600 shadow-lg cursor-nwse-resize"
                  />
                </>
              )}

              <div className={clsx(
                'relative w-full overflow-hidden bg-slate-900 pointer-events-none',
                isPolaroid ? 'rounded-[1px]' : 'rounded-lg'
              )}
              style={{ aspectRatio: photo.aspectRatio || (isLandscape ? 1.25 : 0.8) }}>
                <img
                  src={photo.url}
                  alt="Khoảnh khắc"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>

              {isPolaroid && (
                <div className="flex items-center justify-between mt-1 px-0.5 pointer-events-none">
                  <span className="text-[8px] text-amber-800/60 font-serif">✦ ✦</span>
                  <span className="text-[8px] text-slate-400 font-mono">Lớp: {photo.zIndex || i + 1}</span>
                </div>
              )}
            </div>
          )
        })}

        {normalizedPhotos.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Images size={36} className="text-slate-600 mb-2" />
            <p className="text-sm font-medium">Chưa có ảnh khoảnh khắc nào</p>
            <p className="text-xs text-slate-500 mt-1">Tải ảnh lên từ thanh bên trái để bắt đầu tạo scrapbook</p>
          </div>
        )}
      </div>
      </div>

      {/* Selected photo inspector — floating over the canvas corner */}
      {selectedPhoto && (
        <div className="hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={selectedPhoto.url} alt="" className="w-8 h-8 rounded object-cover border border-indigo-200" />
              <div>
                <p className="text-xs font-bold text-slate-700">Ảnh đang chọn</p>
                <p className="text-[10px] text-slate-500">Lớp #{selectedPhoto.zIndex} · {selectedPhoto.rotation || 0}°</p>
              </div>
            </div>
            <button onClick={() => setSelectedPhotoId(null)} className="text-xs text-slate-400 hover:text-slate-600">Đóng</button>
          </div>

          {/* Rotation */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Xoay: {selectedPhoto.rotation || 0}°</span>
            </div>
            <input
              type="range" min="-180" max="180"
              value={selectedPhoto.rotation || 0}
              onChange={e => updatePhoto(selectedPhoto.id, { rotation: parseInt(e.target.value) || 0 })}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Size */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Kích thước: {selectedPhoto.width}px</span>
            </div>
            <input
              type="range" min="110" max="320" step="5"
              value={selectedPhoto.width}
              onChange={e => updatePhoto(selectedPhoto.id, { width: parseInt(e.target.value) || 175 })}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Frame */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Khung ảnh:</p>
            <div className="grid grid-cols-3 gap-1">
              {(['polaroid', 'gold', 'borderless'] as const).map(f => (
                <button
                  key={f} type="button"
                  onClick={() => updatePhoto(selectedPhoto.id, { frame: f })}
                  className={clsx(
                    'py-1 text-[10px] font-medium rounded border',
                    (selectedPhoto.frame || 'polaroid') === f
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white border-slate-200 text-slate-600'
                  )}
                >
                  {f === 'polaroid' ? 'Polaroid' : f === 'gold' ? 'Viền vàng' : 'Không viền'}
                </button>
              ))}
            </div>
          </div>

          {/* Layer */}
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => bringToFront(selectedPhoto.id)}
              className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
            ><Layers size={13} /> Lên trên cùng</button>
            <button type="button" onClick={() => sendToBack(selectedPhoto.id)}
              className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
            ><Layers size={13} className="rotate-180" /> Xuống dưới</button>
          </div>

          {/* Delete */}
          <button type="button" onClick={() => deletePhoto(selectedPhoto.id)}
            className="w-full py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 font-medium border border-red-200"
          ><Trash2 size={13} /> Xóa ảnh này</button>
        </div>
      )}
      </div>

      <p className="text-xs text-slate-400 text-center order-3">
        Kéo thả ảnh để di chuyển · Click vào ảnh để xoay, chỉnh kích thước và thứ tự đè lớp
      </p>
    </div>
  )
}
