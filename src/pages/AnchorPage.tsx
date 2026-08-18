import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import { useSaved } from '../hooks/useSaved'
import { generateAround } from '../lib/outfitEngine'
import { storage } from '../lib/storage'
import { colorHex, paletteLabel } from '../lib/colorTheory'
import type { GeneratedOutfit, ClosetItem, VibeTag } from '../types'
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_EMOJI, VIBE_EMOJI } from '../types'
// ── Mini "Why?" breakdown for a generated outfit ──────────────────────────────
function WhyBreakdown({ outfit, itemMap }: { outfit: GeneratedOutfit; itemMap: Map<string, ClosetItem> }) {
  const pieces = useMemo(() => {
    return [outfit.picks.top, outfit.picks.layer, outfit.picks.bottom, outfit.picks.shoes, outfit.picks.bag, outfit.picks.accessory]
      .filter(Boolean).map(id => itemMap.get(id!)).filter(Boolean) as ClosetItem[]
  }, [outfit, itemMap])

  const allColors = useMemo(() => [...new Set(pieces.flatMap(p => p.colors))], [pieces])
  const palette   = useMemo(() => paletteLabel(pieces.map(p => p.colors)), [pieces])

  const vibeCount = useMemo(() => {
    const m = new Map<VibeTag, number>()
    for (const p of pieces) for (const v of p.vibes) m.set(v, (m.get(v) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [pieces])

  const catLabels = pieces.map(p => CATEGORY_LABEL[p.category])

  return (
    <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
      {/* Colors */}
      {allColors.length > 0 && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] shrink-0">🎨</span>
          <div className="flex gap-1 shrink-0">
            {allColors.slice(0, 5).map(c => (
              <span key={c} className="w-3 h-3 rounded-full border border-white/80 shadow-sm" style={{ background: colorHex(c) }} />
            ))}
          </div>
          <span className="text-[10px] text-stone-400 truncate">
            {allColors.slice(0, 3).join(' · ')}
            {palette ? ` — ${palette.toLowerCase()}` : ''}
          </span>
        </div>
      )}

      {/* Vibe */}
      {vibeCount.length > 0 && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] shrink-0">✨</span>
          <span className="text-[10px] text-stone-400 truncate">
            {vibeCount.map(([v, n]) => `${VIBE_EMOJI[v] ?? ''} ${v} ×${n}`).join('  ')}
          </span>
        </div>
      )}

      {/* Completeness */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] shrink-0">👗</span>
        <span className="text-[10px] text-stone-400 truncate">{catLabels.join(' · ')}</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnchorPage() {
  const [params] = useSearchParams()
  const { items } = useCloset()
  const { saveOutfit, isSaved } = useSaved()

  const [anchor, setAnchor] = useState<ClosetItem | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([])
  const [generating, setGenerating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const seenKeys = useRef(new Set<string>())

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  // Deep-link: ?item=<id>
  useEffect(() => {
    const id = params.get('item')
    if (id) {
      const found = items.find(i => i.id === id)
      if (found) setAnchor(found)
    }
  }, [params, items])

  const filteredItems = useMemo(() => {
    if (filterCat === 'all') return items
    return items.filter(i => i.category === filterCat)
  }, [items, filterCat])

  const generate = useCallback((anchorItem: ClosetItem) => {
    setGenerating(true)
    setExpandedId(null)
    setTimeout(() => {
      if (seenKeys.current.size > 50) seenKeys.current.clear()
      const pairings = storage.getPairings()
      const all = generateAround(anchorItem, items, 12, pairings)
      const fresh = all.filter(o => {
        const key = [o.picks.top, o.picks.bottom, o.picks.shoes, o.picks.layer ?? ''].join(':')
        if (seenKeys.current.has(key)) return false
        seenKeys.current.add(key)
        return true
      })
      setOutfits((fresh.length ? fresh : all).slice(0, 6))
      setGenerating(false)
    }, 500)
  }, [items])

  const pickAnchor = (item: ClosetItem) => {
    setAnchor(item)
    seenKeys.current.clear()
    generate(item)
  }

  const handleSave = (outfit: GeneratedOutfit) => {
    saveOutfit(outfit)
    storage.recordPairing(Object.values(outfit.picks).filter(Boolean) as string[])
    setSavedIds(s => new Set([...s, outfit.id]))
  }

  const getOutfitPieces = (outfit: GeneratedOutfit) =>
    [outfit.picks.top, outfit.picks.layer, outfit.picks.bottom, outfit.picks.shoes, outfit.picks.bag, outfit.picks.accessory]
      .filter(Boolean).map(id => ({ id: id!, item: itemMap.get(id!) })).filter(e => e.item) as { id: string; item: ClosetItem }[]

  // ── Pick screen ─────────────────────────────────────────────────────────────
  if (!anchor) {
    return (
      <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto bg-[#F7F3EE]">
        <div className="px-5 pt-12 pb-4">
          <Link to="/closet" className="text-xs text-stone-400 mb-3 block">← Wardrobe</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-800">Style a piece</h1>
          <p className="text-sm text-stone-400 mt-1">Pick one item and we'll build outfits around it</p>
        </div>

        {/* category filter */}
        <div className="flex gap-2 px-5 mb-4 overflow-x-auto no-scrollbar">
          {(['all', ...CATEGORIES] as string[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${filterCat === cat ? 'text-white border-transparent' : 'border-stone-200 text-stone-500'}`}
              style={filterCat === cat ? { background: '#7B3428' } : {}}
            >
              {cat === 'all' ? 'All' : `${CATEGORY_EMOJI[cat as keyof typeof CATEGORY_EMOJI]} ${CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL]}`}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-10 text-center">
            <span className="text-5xl">👗</span>
            <p className="font-semibold text-stone-700">No items yet</p>
            <Link to="/upload" className="px-5 py-2.5 rounded-full text-white text-sm font-bold" style={{ background: '#7B3428' }}>
              Add items
            </Link>
          </div>
        ) : (
          <div className="px-5 grid grid-cols-3 gap-2">
            {filteredItems.map(item => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => pickAnchor(item)}
                className="aspect-[3/4] rounded-2xl overflow-hidden relative bg-white border-2 border-transparent hover:border-[#7B3428] transition-all group shadow-sm"
              >
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 inset-x-0 p-2 translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                  <p className="text-white text-[10px] font-bold truncate">{item.name}</p>
                </div>
                <span className="absolute top-2 left-2 text-sm">{CATEGORY_EMOJI[item.category]}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto bg-[#F7F3EE]">
      <div className="px-5 pt-12 pb-4">
        <button onClick={() => { setAnchor(null); setOutfits([]) }} className="text-xs text-stone-400 mb-3 block">← Pick different piece</button>
        <h1 className="text-xl font-extrabold tracking-tight text-stone-800">Outfits with this piece</h1>
      </div>

      {/* Anchor chip */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border-2" style={{ borderColor: '#7B3428' }}>
          <div className="w-14 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-50">
            <img src={anchor.image} alt={anchor.name} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#7B3428' }}>
              🔒 Anchor piece
            </p>
            <p className="text-sm font-bold text-stone-800 truncate">{anchor.name}</p>
            <p className="text-xs text-stone-400">{CATEGORY_EMOJI[anchor.category]} {CATEGORY_LABEL[anchor.category]}</p>
          </div>
          <button
            onClick={() => { seenKeys.current.clear(); generate(anchor) }}
            disabled={generating}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: '#7B3428' }}
          >
            {generating ? '...' : '↻ More'}
          </button>
        </div>
      </div>

      {/* Outfit cards */}
      {generating ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="text-4xl"
          >✨</motion.div>
        </div>
      ) : outfits.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-10 text-center">
          <span className="text-4xl">😕</span>
          <p className="font-semibold text-stone-700">Not enough pieces to build around this</p>
          <p className="text-sm text-stone-400">Add more tops, bottoms, or shoes to your wardrobe</p>
          <Link to="/upload" className="mt-2 px-5 py-2.5 rounded-full text-white text-sm font-bold" style={{ background: '#7B3428' }}>
            Add items
          </Link>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-4">
          <AnimatePresence>
            {outfits.map((outfit, idx) => {
              const pieces = getOutfitPieces(outfit)
              const expanded = expandedId === outfit.id
              const alreadySaved = savedIds.has(outfit.id) || isSaved(outfit.id)
              const anchorPiece = pieces.find(p => p.id === anchor.id)

              return (
                <motion.div
                  key={outfit.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm"
                >
                  {/* Photo grid */}
                  <div className={`grid gap-0.5 ${pieces.length <= 3 ? 'grid-cols-3' : pieces.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {pieces.map(({ id, item }) => (
                      <div key={id} className={`relative bg-stone-50 ${pieces.length === 4 ? 'aspect-square' : 'aspect-[3/4]'}`}>
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        {/* Anchor highlight */}
                        {id === anchor.id && (
                          <div className="absolute inset-0 pointer-events-none rounded-sm" style={{ boxShadow: 'inset 0 0 0 2px #7B3428' }}>
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: '#7B3428' }}>
                              🔒
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-stone-900/70 py-0.5 px-1">
                          <p className="text-[8px] font-bold text-white uppercase tracking-wider truncate">
                            {CATEGORY_LABEL[item.category]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Vibe name */}
                  <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-stone-800">{outfit.vibeName}</p>
                      {anchorPiece && (
                        <p className="text-[10px] text-stone-400">built around {anchor.name}</p>
                      )}
                    </div>
                    <div className="text-xs font-bold px-2 py-1 rounded-full bg-stone-100 text-stone-500">
                      {Math.round(Math.min(outfit.score, 100))}%
                    </div>
                  </div>

                  {/* Why? expandable */}
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => setExpandedId(expanded ? null : outfit.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-fuchsia-500"
                    >
                      <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
                      Why this works
                    </button>
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <WhyBreakdown outfit={outfit} itemMap={itemMap} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Save */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => !alreadySaved && handleSave(outfit)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                      style={{ background: alreadySaved ? '#22c55e' : '#7B3428' }}
                    >
                      {alreadySaved ? '✓ Saved' : '❤️ Save this look'}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
