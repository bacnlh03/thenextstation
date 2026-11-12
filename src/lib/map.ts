export const DEFAULT_VENUE = {
  lat: 10.8775838,
  lng: 106.8011814,
}

export interface MapLocation {
  lat?: number | string
  lng?: number | string
  query?: string
  label: string
}

export function resolveMapCoords(location: Pick<MapLocation, 'lat' | 'lng' | 'query'>) {
  if (location.lat != null && location.lng != null) {
    const lat = typeof location.lat === 'number' ? location.lat : parseFloat(String(location.lat))
    const lng = typeof location.lng === 'number' ? location.lng : parseFloat(String(location.lng))
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng }
    }
  }
  return null
}

export function getMapParam(location: Pick<MapLocation, 'lat' | 'lng' | 'query'>) {
  const coords = resolveMapCoords(location)
  if (coords) return `${coords.lat},${coords.lng}`
  return location.query?.trim() || ''
}

export function getMapEmbedUrl(location: Pick<MapLocation, 'lat' | 'lng' | 'query'>) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(getMapParam(location))}&z=16&output=embed`
}

export function getDirectionsUrl(location: Pick<MapLocation, 'lat' | 'lng' | 'query'>) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getMapParam(location))}`
}

export function getOpenMapUrl(location: Pick<MapLocation, 'lat' | 'lng' | 'query'>) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getMapParam(location))}`
}

export function hasMapLocation(
  el: { mapLat?: number | string; mapLng?: number | string; mapQuery?: string; id?: string; content?: string }
) {
  if (el.mapLat != null && el.mapLng != null && el.mapLat !== '' && el.mapLng !== '') return true
  if (el.mapQuery?.trim()) return true
  if (el.id === 'details_block' && el.content?.includes('\n')) return true
  return false
}

export function getElementMapLocation(
  el: { mapLat?: number | string; mapLng?: number | string; mapQuery?: string; id?: string; content?: string }
): Pick<MapLocation, 'lat' | 'lng' | 'query'> {
  if (el.mapLat != null && el.mapLng != null && el.mapLat !== '' && el.mapLng !== '') {
    return { lat: el.mapLat, lng: el.mapLng }
  }
  if (el.id === 'details_block') {
    return { lat: DEFAULT_VENUE.lat, lng: DEFAULT_VENUE.lng }
  }
  const query = el.mapQuery?.trim()
  return query ? { query } : {}
}
