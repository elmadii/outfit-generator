import type { ClosetItem, SavedOutfit, Collection, InspoImage } from '../types'

const KEYS = {
  items: 'fitcheck:items',
  saved: 'fitcheck:saved',
  collections: 'fitcheck:collections',
  inspo: 'fitcheck:inspo',
  pairings: 'fitcheck:pairings',
  theme: 'fitcheck:theme',
}

function get<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}
function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const storage = {
  getItems: (): ClosetItem[] => get(KEYS.items, []),
  setItems: (v: ClosetItem[]) => set(KEYS.items, v),

  getSaved: (): SavedOutfit[] => get(KEYS.saved, []),
  setSaved: (v: SavedOutfit[]) => set(KEYS.saved, v),

  getCollections: (): Collection[] => get(KEYS.collections, []),
  setCollections: (v: Collection[]) => set(KEYS.collections, v),

  getInspo: (): InspoImage[] => get(KEYS.inspo, []),
  setInspo: (v: InspoImage[]) => set(KEYS.inspo, v),

  getPairings: (): Record<string, number> => get(KEYS.pairings, {}),
  recordPairing: (ids: string[]) => {
    const pairings = get<Record<string, number>>(KEYS.pairings, {})
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join(':')
        pairings[key] = (pairings[key] ?? 0) + 1
      }
    set(KEYS.pairings, pairings)
  },

  getTheme: (): 'light' | 'dark' => get(KEYS.theme, 'light'),
  setTheme: (v: 'light' | 'dark') => set(KEYS.theme, v),
}
