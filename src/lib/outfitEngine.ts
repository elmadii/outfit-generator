import type { ClosetItem, GeneratedOutfit, OutfitPick, VibeTag } from '../types'
import { outfitColorScore, paletteLabel } from './colorTheory'
import { v4 as uuid } from 'uuid'

export interface ReadyCheck {
  ready: boolean
  tops: number
  bottoms: number
  shoes: number
  message: string
}

export function outfitReadyCheck(items: ClosetItem[]): ReadyCheck {
  const tops = items.filter(i => i.category === 'tops').length
  const bottoms = items.filter(i => i.category === 'bottoms').length
  const shoes = items.filter(i => i.category === 'shoes').length
  const ready = tops >= 1 && bottoms >= 1 && shoes >= 1
  const missing: string[] = []
  if (tops < 1) missing.push('1 top')
  if (bottoms < 1) missing.push('1 bottom')
  if (shoes < 1) missing.push('1 pair of shoes')
  return {
    ready,
    tops, bottoms, shoes,
    message: ready ? 'Ready to generate!' : `Need ${missing.join(', ')} to generate fits`,
  }
}

function pickVibeName(vibes: VibeTag[], score: number): { name: string; reason: string } {
  const vibeMap: Record<VibeTag, { name: string; prefix: string }> = {
    casual: { name: 'Effortless Chill', prefix: 'Relaxed layers and easy combos' },
    preppy: { name: 'Campus Ready', prefix: 'Polished and put-together' },
    sporty: { name: 'On the Move', prefix: 'Athletic energy with street appeal' },
    edgy: { name: 'Dark Horse', prefix: 'Bold contrasts and attitude' },
    minimalist: { name: 'Clean Slate', prefix: 'Less is more — perfectly balanced' },
    luxury: { name: 'Elevated', prefix: 'Premium feel from head to toe' },
    romantic: { name: 'Soft Hour', prefix: 'Dreamy and feminine' },
    streetwear: { name: 'Street Code', prefix: 'Urban and unapologetically cool' },
    boho: { name: 'Free Spirit', prefix: 'Earthy textures and easy flow' },
    y2k: { name: 'Throwback Fit', prefix: '2000s nostalgia done right' },
  }
  const top = vibes.find(v => vibeMap[v]) ?? null
  const base = top ? vibeMap[top] : { name: 'Mixed Bag', prefix: 'An eclectic combo' }
  const scoreNote = score >= 85 ? "— colors are on point" : score >= 70 ? "— solid color story" : "— bold contrast"
  return { name: base.name, reason: `${base.prefix} ${scoreNote}.` }
}

export function generateOutfits(
  items: ClosetItem[],
  count = 12,
  pairings: Record<string, number> = {},
): GeneratedOutfit[] {
  const tops = items.filter(i => i.category === 'tops')
  const bottoms = items.filter(i => i.category === 'bottoms')
  const shoes = items.filter(i => i.category === 'shoes')
  const bags = items.filter(i => i.category === 'bags')
  const accessories = items.filter(i => i.category === 'accessories')

  if (!tops.length || !bottoms.length || !shoes.length) return []

  const seen = new Set<string>()
  const outfits: GeneratedOutfit[] = []

  const pairingBonus = (ids: string[]) => {
    let bonus = 0
    for (let i = 0; i < ids.length; i++)
      for (let j = i+1; j < ids.length; j++) {
        const key = [ids[i],ids[j]].sort().join(':')
        bonus += Math.min((pairings[key] ?? 0) * 2, 8)
      }
    return bonus
  }

  let attempts = 0
  while (outfits.length < count && attempts < count * 20) {
    attempts++
    const top = tops[Math.floor(Math.random() * tops.length)]
    const bottom = bottoms[Math.floor(Math.random() * bottoms.length)]
    const shoe = shoes[Math.floor(Math.random() * shoes.length)]
    const bag = bags.length && Math.random() > 0.5 ? bags[Math.floor(Math.random() * bags.length)] : null
    const acc = accessories.length && Math.random() > 0.6 ? accessories[Math.floor(Math.random() * accessories.length)] : null

    const key = [top.id, bottom.id, shoe.id].join(':')
    if (seen.has(key)) continue
    seen.add(key)

    const colorLists = [top.colors, bottom.colors, shoe.colors, bag?.colors ?? [], acc?.colors ?? []]
    const colorScore = outfitColorScore(colorLists)
    const allVibes = [...new Set([...top.vibes, ...bottom.vibes, ...shoe.vibes])] as VibeTag[]

    const vibeScore = (() => {
      if (!allVibes.length) return 0
      const counts = new Map<VibeTag, number>()
      for (const item of [top, bottom, shoe]) for (const v of item.vibes) counts.set(v, (counts.get(v)??0)+1)
      const max = Math.max(...counts.values())
      return max >= 2 ? 10 : max >= 1 ? 5 : 0
    })()

    const bonus = pairingBonus([top.id, bottom.id, shoe.id])
    const score = Math.min(100, Math.round(colorScore * 0.75 + vibeScore + bonus + Math.random() * 5))

    const dominantVibe = allVibes.length
      ? allVibes.reduce((a, b) => {
          const ac = [top,bottom,shoe].filter(i=>i.vibes.includes(a)).length
          const bc = [top,bottom,shoe].filter(i=>i.vibes.includes(b)).length
          return ac >= bc ? a : b
        })
      : null

    const { name: vibeName, reason: baseReason } = pickVibeName(allVibes, score)
    const palette = paletteLabel(colorLists)
    const reason = `${baseReason} ${palette}.`

    const picks: OutfitPick = { top: top.id, bottom: bottom.id, shoes: shoe.id }
    if (bag) picks.bag = bag.id
    if (acc) picks.accessory = acc.id

    outfits.push({ id: uuid(), picks, score, vibeName, reason, dominantVibe, createdAt: Date.now() })
  }

  return outfits.sort((a, b) => b.score - a.score)
}

export function outfitItems(outfit: GeneratedOutfit, itemMap: Map<string, ClosetItem>): ClosetItem[] {
  return [outfit.picks.top, outfit.picks.bottom, outfit.picks.shoes, outfit.picks.bag, outfit.picks.accessory]
    .filter(Boolean).map(id => itemMap.get(id!)).filter(Boolean) as ClosetItem[]
}
