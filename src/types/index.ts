export type Category = 'tops' | 'layer' | 'bottoms' | 'shoes' | 'bags' | 'accessories'

export const CATEGORIES: Category[] = ['tops', 'layer', 'bottoms', 'shoes', 'bags', 'accessories']

export const CATEGORY_LABEL: Record<Category, string> = {
  tops: 'Tops',
  layer: 'Layer',
  bottoms: 'Bottoms',
  shoes: 'Shoes',
  bags: 'Bags',
  accessories: 'Accessories',
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  tops: '👕',
  layer: '🧥',
  bottoms: '👖',
  shoes: '👟',
  bags: '👜',
  accessories: '💍',
}

export type VibeTag =
  | 'casual'
  | 'preppy'
  | 'sporty'
  | 'edgy'
  | 'minimalist'
  | 'luxury'
  | 'romantic'
  | 'streetwear'
  | 'boho'
  | 'y2k'

export const VIBE_TAGS: VibeTag[] = [
  'casual',
  'preppy',
  'sporty',
  'edgy',
  'minimalist',
  'luxury',
  'romantic',
  'streetwear',
  'boho',
  'y2k',
]

export const VIBE_EMOJI: Record<VibeTag, string> = {
  casual: '👟',
  preppy: '🎀',
  sporty: '🏀',
  edgy: '🖤',
  minimalist: '⚪️',
  luxury: '💎',
  romantic: '🌸',
  streetwear: '🧢',
  boho: '🌾',
  y2k: '✨',
}

export interface ClosetItem {
  id: string
  category: Category
  image: string // data URL
  name: string
  colors: string[] // color names, see lib/colorTheory.ts
  vibes: VibeTag[]
  customVibes?: string[] // user-defined free-text vibes
  aiDescription?: string // Claude-generated description of the piece
  notes?: string
  createdAt: number
  timesUsed: number
}

export interface WearEntry {
  id: string
  date: string       // YYYY-MM-DD
  outfitId?: string  // optional reference to a saved outfit
  note: string
  createdAt: number
}

/** A draft item pending naming, produced by the crop/extraction step. */
export interface DraftItem {
  id: string
  image: string
  category: Category
  box: { x: number; y: number; w: number; h: number }
}

export interface OutfitPick {
  top?: string
  layer?: string
  bottom?: string
  shoes?: string
  bag?: string
  accessory?: string
}

export interface GeneratedOutfit {
  id: string
  picks: OutfitPick
  score: number
  vibeName: string
  reason: string
  dominantVibe: VibeTag | null
  createdAt: number
}

export interface SavedOutfit extends GeneratedOutfit {
  savedAt: number
  collectionId?: string
}

export interface Collection {
  id: string
  name: string
  createdAt: number
}

export interface InspoImage {
  id: string
  image: string
  palette: string[] // hex colors
  createdAt: number
}

export interface Noticed {
  id: string
  text: string
  createdAt: number
}
