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
  return { ready, tops, bottoms, shoes, message: ready ? 'Ready to generate!' : `Need ${missing.join(', ')} to generate fits` }
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
  const scoreNote = score >= 85 ? '— colors are on point' : score >= 70 ? '— solid color story' : '— bold contrast'
  return { name: base.name, reason: `${base.prefix} ${scoreNote}.` }
}

function calcScore(
  top: ClosetItem,
  bottom: ClosetItem,
  shoe: ClosetItem,
  bag: ClosetItem | null,
  acc: ClosetItem | null,
  pairings: Record<string, number>,
): number {
  const colorLists = [top.colors, bottom.colors, shoe.colors, bag?.colors ?? [], acc?.colors ?? []]

  // Color harmony: 0-60 pts. Default 30 when not enough colors are tagged.
  const coloredLists = colorLists.filter(l => l.length > 0)
  const colorComponent = coloredLists.length >= 2
    ? Math.round(outfitColorScore(colorLists) * 0.6)
    : coloredLists.length === 1 ? 35 : 30

  // Vibe cohesion: 0-25 pts. Rewards outfits where pieces share a vibe.
  const vibeCounts = new Map<VibeTag, number>()
  for (const item of [top, bottom, shoe]) {
    for (const v of item.vibes) vibeCounts.set(v, (vibeCounts.get(v) ?? 0) + 1)
  }
  const maxShared = vibeCounts.size > 0 ? Math.max(...vibeCounts.values()) : 0
  const vibeComponent = maxShared >= 3 ? 25 : maxShared >= 2 ? 17 : maxShared === 1 && vibeCounts.size > 0 ? 8 : 0

  // Completeness bonus: 0-10 pts
  const completenessBonus = (bag ? 5 : 0) + (acc ? 5 : 0)

  // Pairing history: 0-5 pts
  const ids = [top.id, bottom.id, shoe.id]
  let pairingPts = 0
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const key = [ids[i], ids[j]].sort().join(':')
      pairingPts += Math.min((pairings[key] ?? 0), 2)
    }

  return Math.min(100, colorComponent + vibeComponent + completenessBonus + Math.min(5, pairingPts))
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

    const score = calcScore(top, bottom, shoe, bag, acc, pairings)

    const allVibes = [...new Set([...top.vibes, ...bottom.vibes, ...shoe.vibes])] as VibeTag[]
    const dominantVibe = allVibes.length
      ? allVibes.reduce((a, b) => {
          const ac = [top, bottom, shoe].filter(i => i.vibes.includes(a)).length
          const bc = [top, bottom, shoe].filter(i => i.vibes.includes(b)).length
          return ac >= bc ? a : b
        })
      : null

    const { name: vibeName, reason: baseReason } = pickVibeName(allVibes, score)
    const colorLists = [top.colors, bottom.colors, shoe.colors, bag?.colors ?? [], acc?.colors ?? []]
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
