import { apiPost, ApiError } from './api'

export type UploadedImage = { url: string; width: number; height: number }

// Downscale a File and upload it via the backend. If image storage isn't
// configured (backend 503), keep the downscaled data URI so the admin never
// hard-stops on missing infrastructure. Width and height are the downscaled
// size, so the public grid can reserve space before the image loads.
export async function uploadImageFile(
  file: File,
  kind: 'services' | 'portfolio',
  token: string
): Promise<UploadedImage> {
  const { dataUrl, width, height } = await fileToDataUrl(file)
  try {
    const { url } = await apiPost<{ url: string }>('/admin/upload', { data: dataUrl, kind }, token)
    return { url, width, height }
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) return { url: dataUrl, width, height } // storage not set up
    throw err
  }
}

// Read an image file, downscale it to fit maxDim, and return a JPEG data URI.
// Keeps base64 payloads small enough to store inline when storage is absent.
export function fileToDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That file is not a valid image.'))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('This browser could not prepare that image.'))
        // JPEG has no alpha, and a fresh canvas is transparent black. Paint white
        // first so transparent areas of a PNG become paper, not solid black.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), width, height })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
