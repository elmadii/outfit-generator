export interface ColorDef {
  name: string
  hex: string
  hue: number // 0-360, -1 for neutrals
  neutral: boolean
  warm: boolean
}

// Curated named palette — hue computed from hex so harmony math is consistent.
const RAW_COLORS: Array<[string, string, boolean]> = [
  ['Black', '#0a0a0a', true],
  ['White', '#fafafa', true],
  ['Ivory', '#f4ede0', true],
  ['Gray', '#8b8b8b', true],
  ['Charcoal', '#2e2e33', true],
  ['Beige', '#d8c3a0', true],
  ['Tan', '#c2a375', true],
  ['Brown', '#6b4226', true],
  ['Denim Blue', '#3b5c82', false],
  ['Navy', '#1b2a4a', false],
  ['Sky Blue', '#8ec9e6', false],
  ['Teal', '#1f8a8c', false],
  ['Green', '#3e6b3e', false],
  ['Olive', '#6b7a3a', false],
  ['Sage', '#a3b18a', false],
  ['Red', '#c0392b', false],
  ['Burgundy', '#6b1f2a', false],
  ['Pink', '#e8a0bf', false],
  ['Hot Pink', '#e91e8c', false],
  ['Orange', '#e07b39', false],
  ['Rust', '#a85326', false],
  ['Yellow', '#f0c93b', false],
  ['Mustard', '#c9a227', false],
  ['Purple', '#7d5ba6', false],
  ['Lavender', '#c4b6e0', false],
  ['Gold', '#cfa032', false],
  ['Silver', '#c7c9cc', true],
]

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return -1
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return h
}

export const COLORS: ColorDef[] = RAW_COLORS.map(([name, hex, neutral]) => ({
  name,
  hex,
  neutral,
  warm: !neutral && (hexToHue(hex) < 90 || hexToHue(hex) > 300),
  hue: neutral ? -1 : hexToHue(hex),
}))

export const COLOR_NAMES = COLORS.map((c) => c.name)

export function colorHex(name: string): string {
  return COLORS.find((c) => c.name === name)?.hex ?? '#999999'
}

function getColor(name: string): ColorDef | undefined {
  return COLORS.find((c) => c.name === name)
}

function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** Pairwise harmony score 0-1 between two color names. */
function pairHarmony(a: string, b: string): number {
  const ca = getColor(a)
  const cb = getColor(b)
  if (!ca || !cb) return 0.6
  if (ca.name === cb.name) return 0.95 // monochrome
  if (ca.neutral || cb.neutral) return 0.9 // neutrals go with everything
  const d = hueDist(ca.hue, cb.hue)
  // analogous (close hues) and complementary (opposite hues) both read as "styled"
  if (d <= 40) return 0.85 // analogous
  if (d >= 150) return 0.8 // complementary
  if (d <= 80) return 0.6 // soft clash
  return 0.45 // busy clash
}

/** Score a whole outfit's color list 0-100. */
export function outfitColorScore(colorLists: string[][]): number {
  const flat = colorLists.filter((l) => l.length > 0)
  if (flat.length < 2) return 75
  let total = 0
  let count = 0
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      for (const a of flat[i]) {
        for (const b of flat[j]) {
          total += pairHarmony(a, b)
          count++
        }
      }
    }
  }
  if (count === 0) return 75
  return Math.round((total / count) * 100)
}

export function paletteLabel(colorLists: string[][]): string {
  const flat = colorLists.flat()
  const allNeutral = flat.every((c) => getColor(c)?.neutral)
  if (allNeutral) return 'Neutral & clean'
  const unique = new Set(flat)
  if (unique.size <= 1) return 'Monochrome'
  const warmCount = flat.filter((c) => getColor(c)?.warm).length
  const coolCount = flat.filter((c) => !getColor(c)?.neutral && !getColor(c)?.warm).length
  if (warmCount > 0 && coolCount === 0) return 'Warm tones'
  if (coolCount > 0 && warmCount === 0) return 'Cool tones'
  return 'Mixed palette'
}

/** Extract a small dominant-color palette (as hex) from an image data URL by
 * downsampling and bucketing pixels — used for Style Inspo mode. */
export async function extractPalette(imageDataUrl: string, count = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const size = 48
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve([])
      ctx.drawImage(img, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data
      const buckets = new Map<string, { r: number; g: number; b: number; n: number }>()
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        if (a < 200) continue
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`
        const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
        bucket.r += r
        bucket.g += g
        bucket.b += b
        bucket.n++
        buckets.set(key, bucket)
      }
      const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, count)
      resolve(
        sorted.map((b) => {
          const r = Math.round(b.r / b.n)
          const g = Math.round(b.g / b.n)
          const bl = Math.round(b.b / b.n)
          return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`
        }),
      )
    }
    img.onerror = () => resolve([])
    img.src = imageDataUrl
  })
}
