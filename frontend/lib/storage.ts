export const MAX_FILE_SIZE_FREE = 5 * 1024 * 1024    // 5 MB
export const MAX_FILE_SIZE_PAID = 20 * 1024 * 1024   // 20 MB
export const STORAGE_QUOTA_FREE = 25 * 1024 * 1024   // 25 MB
export const STORAGE_QUOTA_PAID = 200 * 1024 * 1024  // 200 MB

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function compressImage(file: File, maxBytes = 2 * 1024 * 1024): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= maxBytes) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_DIM = 2048
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() }))
        },
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
