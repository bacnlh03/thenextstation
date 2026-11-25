export async function getImageAspectRatio(file: File): Promise<number | undefined> {
  if (!file.type.startsWith('image/')) return undefined

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) return undefined
    return image.naturalWidth / image.naturalHeight
  } catch {
    return undefined
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function getImageAspectRatioFromUrl(url: string): Promise<number | undefined> {
  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => {
      resolve(image.naturalWidth && image.naturalHeight
        ? image.naturalWidth / image.naturalHeight
        : undefined)
    }
    image.onerror = () => resolve(undefined)
    image.src = url
  })
}
