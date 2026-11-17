import { apiPost, ApiError } from './api'

export type UploadedImage = { url: string; width: number; height: number }

export type UploadKind = 'services' | 'portfolio' | 'pages'

// The longer edge a photo is shrunk to before it is uploaded. Page photos keep
// more, because the photo at the top of the home page fills the whole screen.
const LONGER_EDGE: Record<UploadKind, number> = { services: 1600, portfolio: 1600, pages: 2400 }

// The API turns away an image over about 6MB. Stay a little under it.
const MAX_IMAGE_BYTES = 5.5 * 1024 * 1024

// Downscale a File and upload it via the backend. If image storage isn't
// configured (backend 503), keep the downscaled data URI so the admin never
// hard-stops on missing infrastructure. Width and height are the downscaled
// size, so the public grid can reserve space before the image loads.
export async function uploadImageFile(file: File, kind: UploadKind, token: string): Promise<UploadedImage> {
  const { dataUrl, width, height } = await fileToDataUrl(file, LONGER_EDGE[kind])
  try {
    const { url } = await apiPost<{ url: string }>('/admin/upload', { data: dataUrl, kind }, token)
    return { url, width, height }
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) return { url: dataUrl, width, height } // storage not set up
    throw err
  }
}

/** The size of the image inside a base64 data URI, which is what the API measures. */
function imageBytes(dataUrl: string) {
  return Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)
}

// Read an image file, downscale it to fit maxDim, and return a JPEG data URI.
// Keeps base64 payloads small enough to store inline when storage is absent.
export function fileToDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.82,
  maxBytes = MAX_IMAGE_BYTES
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
        // A very detailed photo can still be too heavy at this size. Squeeze it
        // harder rather than send something the API is certain to refuse.
        let q = quality
        let dataUrl = canvas.toDataURL('image/jpeg', q)
        while (imageBytes(dataUrl) > maxBytes && q > 0.5) {
          q -= 0.12
          dataUrl = canvas.toDataURL('image/jpeg', q)
        }
        if (imageBytes(dataUrl) > maxBytes) {
          return reject(new Error('That photo is too large to upload. Try a smaller one.'))
        }
        resolve({ dataUrl, width, height })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
