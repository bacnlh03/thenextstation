import { create } from 'zustand'
import { DEFAULT_CONFIG, normalizeMomentPhoto } from '@/types/design'
import type { DesignConfig, DesignElement, PhotoItem } from '@/types/design'
import { useToastStore } from '@/stores/useGuestStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { supabase, INVITATION_ASSETS_BUCKET } from '@/lib/supabase'

const CONFIG_ROW_ID = 'default'

// Recovery map for the 25 photos optimized before originalUrl was introduced.
// The original objects remain in Storage; this only restores their links.
const LEGACY_ORIGINAL_BY_OPTIMIZED = {
  '1795615339129-010dcaef.webp': '1794661937345-186a95ed.jpeg',
  '1795615343302-813477f5.webp': '1794662133746-92b3d56a.jpeg',
  '1795615346988-e01f2b43.webp': '1795600002001-56554c4c.jpeg',
  '1795615350079-b888839b.webp': '1795600023100-6c7f686b.jpeg',
  '1795615357912-39a647a5.webp': '1795600065377-dbfe6de9.jpeg',
  '1795615365304-678dae6a.webp': '1795600103062-d50bf5a5.jpeg',
  '1795615373064-b6e60390.webp': '1795600170458-98b93d35.jpeg',
  '1795615378496-7764f9d3.webp': '1795600221399-3adeaea7.jpeg',
  '1795615382397-ba175d71.webp': '1795600241764-77869914.jpeg',
  '1795615387653-93ac2118.webp': '1795600337674-058e6a43.jpeg',
  '1795615393489-b42d9868.webp': '1795600377454-2ca7304b.jpeg',
  '1795615399232-779f2a88.webp': '1795600409194-159c25d4.jpeg',
  '1795615407796-d7948526.webp': '1795600507946-3d3d3454.jpeg',
  '1795615413775-a6ae893b.webp': '1795600543443-afbf8634.jpeg',
  '1795615421157-5aa6ee9c.webp': '1795600593658-873e2b2f.jpeg',
  '1795615427227-522e8f7b.webp': '1795600634174-6e1227e3.jpeg',
  '1795615434372-9c02f85e.webp': '1795600677284-b54c4fb2.jpeg',
  '1795615438749-488e4bde.webp': '1795600790796-5b2e99ca.jpeg',
  '1795615450155-476d2f01.webp': '1795601286236-f6b845ab.jpeg',
  '1795615456522-e0e87888.webp': '1795601369399-ecaab8c9.jpeg',
  '1795615461015-d1b7d193.webp': '1795601401420-713a1e84.jpeg',
  '1795615469178-dabd7601.webp': '1795601682276-ae761cc1.jpeg',
  '1795615471893-b8b78626.webp': '1795601686068-9eeb31f2.png',
  '1795615473706-a91f23f0.webp': '1795601842060-43b101ee.jpeg',
  '1795615481601-ffc5c805.webp': '1795601894383-9c7e2df3.jpeg',
} as const

async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file

  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = sourceUrl
    await image.decode()

    const maxDimension = 2000
    const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/webp', 0.82)
    )
    if (!blob) return file

    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
      type: 'image/webp',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export const normalizeUrl = (url?: string) => {
  if (!url || url === '') return undefined
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return url
}

function requireAuth(): boolean {
  if (!useAuthStore.getState().isAuthenticated) {
    window.location.href = '/login'
    return false
  }
  return true
}

function normalizeConfigUrls(data: DesignConfig): DesignConfig {
  if (data.music?.url) data.music.url = normalizeUrl(data.music.url) ?? data.music.url
  if (data.background?.image) {
    data.background.image = normalizeUrl(data.background.image) ?? data.background.image
  }
  if (data.elements) {
    data.elements = data.elements.map((el: DesignElement) => {
      if (el.type === 'image' && el.content) {
        return { ...el, content: normalizeUrl(el.content) ?? el.content }
      }
      return el
    })
  }
  if (data.photos) {
    data.photos = data.photos.map((p) => {
      if (typeof p === 'string') return normalizeUrl(p) ?? p
      return { ...p, url: normalizeUrl(p.url) ?? p.url }
    })
  }
  return data
}

interface DesignState {
  config: DesignConfig
  selectedElementId: string | null
  loading: boolean

  clipboard: DesignElement | null
  copyElement: () => void
  pasteElement: () => void

  fetchConfig: () => Promise<void>
  saveConfig: () => Promise<boolean>

  past: DesignConfig[]
  future: DesignConfig[]
  undo: () => void
  redo: () => void
  pushToHistory: () => void
  pushStateToHistory: (state: DesignConfig) => void

  selectElement: (id: string | null) => void
  updateElement: (id: string, updates: Partial<DesignElement>, pushHistory?: boolean) => void
  addElement: (element: DesignElement) => void
  removeElement: (id: string) => void
  updateBackground: (bg: Partial<DesignConfig['background']>) => void
  updateMusic: (music: Partial<DesignConfig['music']>, pushHistory?: boolean) => void
  updatePhotos: (photos: PhotoItem[]) => void
  updatePhotoLayout: (layout: 'collage' | 'grid') => void
  moveElement: (id: string, x: number, y: number) => void

  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  uploadFile: (file: File) => Promise<string | null | undefined>
  optimizeExistingPhotos: () => Promise<boolean>
  restoreOriginalPhotoLinks: () => Promise<boolean>
}

export const useDesignStore = create<DesignState>((set, get) => ({
  config: DEFAULT_CONFIG,
  selectedElementId: null,
  loading: false,
  clipboard: null,

  fetchConfig: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('invitation_config')
        .select('config')
        .eq('id', CONFIG_ROW_ID)
        .maybeSingle()

      if (error) throw error

      const config = data?.config as DesignConfig | undefined
      if (config && Object.keys(config).length > 0) {
        set({ config: normalizeConfigUrls(config) })
      }
    } catch (err) {
      console.error(err)
      useToastStore.getState().showToast('Lỗi tải cấu hình thiết kế', 'error')
    } finally {
      set({ loading: false })
    }
  },

  saveConfig: async () => {
    if (!requireAuth()) return false
    try {
      const { config } = get()
      const { error } = await supabase.from('invitation_config').upsert({
        id: CONFIG_ROW_ID,
        config,
      })
      if (error) throw error
      useToastStore.getState().showToast('Đã lưu thiết kế mới!')
      return true
    } catch (err) {
      console.error(err)
    }
    useToastStore.getState().showToast('Lỗi khi lưu thiết kế', 'error')
    return false
  },

  past: [],
  future: [],

  pushToHistory: () => {
    set((state) => {
      const newPast = [...state.past, state.config]
      if (newPast.length > 20) newPast.shift()
      return { past: newPast, future: [] }
    })
  },

  pushStateToHistory: (configState) => {
    set((state) => {
      const newPast = [...state.past, configState]
      if (newPast.length > 20) newPast.shift()
      return { past: newPast, future: [] }
    })
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return {}
      const previous = state.past[state.past.length - 1]
      const newPast = state.past.slice(0, -1)
      return {
        past: newPast,
        config: previous,
        future: [state.config, ...state.future],
      }
    })
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return {}
      const next = state.future[0]
      const newFuture = state.future.slice(1)
      return {
        past: [...state.past, state.config],
        config: next,
        future: newFuture,
      }
    })
  },

  selectElement: (id) => set({ selectedElementId: id }),

  updateElement: (id, updates, pushHistory = true) => {
    if (pushHistory) get().pushToHistory()
    set((state) => ({
      config: {
        ...state.config,
        elements: state.config.elements.map((el) =>
          el.id === id ? { ...el, ...updates } : el
        ),
      },
    }))
  },

  moveElement: (id, x, y) => {
    set((state) => ({
      config: {
        ...state.config,
        elements: state.config.elements.map((el) =>
          el.id === id ? { ...el, x, y } : el
        ),
      },
    }))
  },

  addElement: (element) => {
    get().pushToHistory()
    set((state) => ({
      config: {
        ...state.config,
        elements: [...state.config.elements, element],
      },
      selectedElementId: element.id,
    }))
  },

  removeElement: (id) => {
    get().pushToHistory()
    set((state) => ({
      config: {
        ...state.config,
        elements: state.config.elements.filter((el) => el.id !== id),
      },
      selectedElementId: null,
    }))
  },

  updateBackground: (bg) => {
    get().pushToHistory()
    set((state) => ({
      config: {
        ...state.config,
        background: { ...state.config.background, ...bg },
      },
    }))
  },

  updateMusic: (musicUpdates, pushHistory = true) => {
    if (pushHistory) get().pushToHistory()
    set((state) => ({
      config: {
        ...state.config,
        music: state.config.music
          ? { ...state.config.music, ...musicUpdates }
          : { url: '', enabled: true, ...musicUpdates },
      },
    }))
  },

  updatePhotos: (photos) => {
    get().pushToHistory()
    set((state) => ({
      config: { ...state.config, photos },
    }))
  },

  updatePhotoLayout: (layout) => {
    get().pushToHistory()
    set((state) => ({
      config: { ...state.config, photoLayout: layout },
    }))
  },

  bringToFront: (id) => {
    get().pushToHistory()
    set((state) => {
      const elIndex = state.config.elements.findIndex((e) => e.id === id)
      if (elIndex < 0 || elIndex === state.config.elements.length - 1) return {}
      const newEls = [...state.config.elements]
      const [el] = newEls.splice(elIndex, 1)
      newEls.push(el)
      return { config: { ...state.config, elements: newEls } }
    })
  },

  sendToBack: (id) => {
    get().pushToHistory()
    set((state) => {
      const elIndex = state.config.elements.findIndex((e) => e.id === id)
      if (elIndex <= 0) return {}
      const newEls = [...state.config.elements]
      const [el] = newEls.splice(elIndex, 1)
      newEls.unshift(el)
      return { config: { ...state.config, elements: newEls } }
    })
  },

  bringForward: (id) => {
    get().pushToHistory()
    set((state) => {
      const elIndex = state.config.elements.findIndex((e) => e.id === id)
      if (elIndex < 0 || elIndex === state.config.elements.length - 1) return {}
      const newEls = [...state.config.elements]
      const [el] = newEls.splice(elIndex, 1)
      newEls.splice(elIndex + 1, 0, el)
      return { config: { ...state.config, elements: newEls } }
    })
  },

  sendBackward: (id) => {
    get().pushToHistory()
    set((state) => {
      const elIndex = state.config.elements.findIndex((e) => e.id === id)
      if (elIndex <= 0) return {}
      const newEls = [...state.config.elements]
      const [el] = newEls.splice(elIndex, 1)
      newEls.splice(elIndex - 1, 0, el)
      return { config: { ...state.config, elements: newEls } }
    })
  },

  copyElement: () => {
    const state = get()
    const { config, selectedElementId } = state
    if (!selectedElementId) return

    const el = config.elements.find((e) => e.id === selectedElementId)
    if (el) {
      set({ clipboard: JSON.parse(JSON.stringify(el)) })
      useToastStore.getState().showToast('Đã sao chép')
    }
  },

  pasteElement: () => {
    const state = get()
    const { clipboard } = state
    if (!clipboard) return

    get().pushToHistory()

    const newId = `${clipboard.type}_${Date.now()}`
    const newElement: DesignElement = {
      ...clipboard,
      id: newId,
      x: clipboard.x + 20,
      y: clipboard.y + 20,
    }

    set((state) => ({
      config: {
        ...state.config,
        elements: [...state.config.elements, newElement],
      },
      selectedElementId: newId,
    }))
    useToastStore.getState().showToast('Đã dán')
  },

  uploadFile: async (file: File) => {
    if (!requireAuth()) return null
    try {
      const optimizedFile = await optimizeImage(file)
      const ext = optimizedFile.name.split('.').pop() ?? 'bin'
      const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

      const { error } = await supabase.storage
        .from(INVITATION_ASSETS_BUCKET)
        .upload(path, optimizedFile, {
          upsert: false,
          contentType: optimizedFile.type || undefined,
          cacheControl: '31536000',
        })

      if (error) throw error

      const { data } = supabase.storage
        .from(INVITATION_ASSETS_BUCKET)
        .getPublicUrl(path)

      return data.publicUrl
    } catch (err) {
      console.error('Upload failed:', err)
    }
    useToastStore.getState().showToast('Lỗi khi tải file lên', 'error')
    return null
  },

  optimizeExistingPhotos: async () => {
    if (!requireAuth()) return false

    const currentConfig = get().config
    const sourcePhotos = currentConfig.photos || []
    if (!sourcePhotos.length) {
      useToastStore.getState().showToast('Chưa có ảnh để tối ưu', 'error')
      return false
    }

    try {
      const optimizedPhotos: PhotoItem[] = []

      for (let index = 0; index < sourcePhotos.length; index += 1) {
        const source = normalizeMomentPhoto(sourcePhotos[index], index, sourcePhotos.length)
        const response = await fetch(source.url)
        if (!response.ok) throw new Error(`Không tải được ảnh ${index + 1}: ${response.status}`)

        const blob = await response.blob()
        const file = new File([blob], `existing-photo-${index + 1}.jpg`, {
          type: blob.type || 'image/jpeg',
        })
        const optimizedUrl = await get().uploadFile(file)
        if (!optimizedUrl) throw new Error(`Không upload được ảnh ${index + 1}`)

        optimizedPhotos.push({
          ...source,
          url: optimizedUrl,
          originalUrl: source.originalUrl || source.url,
          thumbnailUrl: undefined,
        })
      }

      get().pushToHistory()
      set(state => ({
        config: { ...state.config, photos: optimizedPhotos },
      }))

      const saved = await get().saveConfig()
      if (!saved) {
        set({ config: currentConfig })
        return false
      }

      useToastStore.getState().showToast(`Đã tối ưu ${optimizedPhotos.length} ảnh`)
      return true
    } catch (error) {
      console.error('Optimize existing photos failed:', error)
      useToastStore.getState().showToast('Không thể tối ưu ảnh. Ảnh cũ vẫn được giữ nguyên.', 'error')
      return false
    }
  },

  restoreOriginalPhotoLinks: async () => {
    if (!requireAuth()) return false

    const currentConfig = get().config
    const sourcePhotos = currentConfig.photos || []
    if (!sourcePhotos.length) {
      useToastStore.getState().showToast('Chưa có ảnh để khôi phục', 'error')
      return false
    }

    try {
      const restoredPhotos = sourcePhotos.map((photo, index) => {
        const source = normalizeMomentPhoto(photo, index, sourcePhotos.length)
        const filename = source.url.split('/').pop() || ''
        const originalFilename = LEGACY_ORIGINAL_BY_OPTIMIZED[filename as keyof typeof LEGACY_ORIGINAL_BY_OPTIMIZED]
        if (!originalFilename) throw new Error(`Không tìm thấy ảnh gốc cho ảnh ${index + 1}`)

        const originalUrl = new URL(source.url)
        originalUrl.pathname = originalUrl.pathname.replace(filename, originalFilename)
        return { ...source, originalUrl: originalUrl.toString() }
      })

      // The design currently contains a large base64 image inside elements.
      // Move it to Storage before saving so this recovery request does not
      // send the bulky data URL through the REST upsert endpoint again.
      const compactElements = await Promise.all(currentConfig.elements.map(async element => {
        if (element.type !== 'image' || !element.content?.startsWith('data:image/')) return element

        const imageResponse = await fetch(element.content)
        const imageBlob = await imageResponse.blob()
        const imageFile = new File([imageBlob], `design-element-${element.id}.png`, {
          type: imageBlob.type || 'image/png',
        })
        const imageUrl = await get().uploadFile(imageFile)
        if (!imageUrl) throw new Error(`Không thể chuyển ảnh nền ${element.id} lên Storage`)
        return { ...element, content: imageUrl }
      }))

      get().pushToHistory()
      set(state => ({
        config: { ...state.config, elements: compactElements, photos: restoredPhotos },
      }))
      const saved = await get().saveConfig()
      if (!saved) {
        set({ config: currentConfig })
        return false
      }

      useToastStore.getState().showToast('Đã khôi phục liên kết ảnh gốc')
      return true
    } catch (error) {
      set({ config: currentConfig })
      console.error('Restore original photo links failed:', error)
      useToastStore.getState().showToast('Không thể khôi phục liên kết ảnh gốc', 'error')
      return false
    }
  },
}))
