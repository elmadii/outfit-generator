export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.onerror = rej
    reader.readAsDataURL(file)
  })
}

export function resizeImage(dataUrl: string, maxSize = 800): Promise<string> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      res(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = dataUrl
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.onerror = rej
    reader.readAsDataURL(blob)
  })
}

export async function removeBackground(dataUrl: string): Promise<string> {
  const { removeBackground: mlRemove } = await import('@imgly/background-removal')
  const blob = await mlRemove(dataUrl, {
    output: { format: 'image/png', quality: 0.9 },
  })
  return blobToDataUrl(blob)
}
