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

/** Canvas-based simple background removal by flood-filling corners.
 *  Works well for items on plain/white backgrounds. */
export function removeBackground(dataUrl: string): Promise<string> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      const w = img.width, h = img.height
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, w, h)
      const px = data.data

      // sample corner colors and build bg color set
      const corners = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]]
      const bgColors = corners.map(([x,y]) => {
        const i = (y * w + x) * 4
        return [px[i], px[i+1], px[i+2]]
      })

      const tolerance = 35
      const isBackground = (i: number) =>
        bgColors.some(([br,bg,bb]) =>
          Math.abs(px[i]-br) + Math.abs(px[i+1]-bg) + Math.abs(px[i+2]-bb) < tolerance * 3
        )

      // flood fill from corners
      const visited = new Uint8Array(w * h)
      const queue: number[] = []
      corners.forEach(([x,y]) => { const idx = y*w+x; if (!visited[idx]) { visited[idx]=1; queue.push(idx) } })

      while (queue.length) {
        const idx = queue.pop()!
        const pi = idx * 4
        if (!isBackground(pi)) continue
        px[pi+3] = 0
        const x = idx % w, y = Math.floor(idx / w)
        for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nx = x+dx, ny = y+dy
          if (nx>=0 && nx<w && ny>=0 && ny<h) {
            const ni = ny*w+nx
            if (!visited[ni]) { visited[ni]=1; queue.push(ni) }
          }
        }
      }

      ctx.putImageData(data, 0, 0)
      res(canvas.toDataURL('image/png'))
    }
    img.src = dataUrl
  })
}
