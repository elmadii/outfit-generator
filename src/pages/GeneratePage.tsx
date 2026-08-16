import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import { useSaved } from '../hooks/useSaved'
import { generateOutfits, outfitReadyCheck } from '../lib/outfitEngine'
import { storage } from '../lib/storage'
import OutfitCard from '../components/OutfitCard'
import type { GeneratedOutfit } from '../types'

export default function GeneratePage() {
  const { items } = useCloset()
  const { saveOutfit, unsaveOutfit, isSaved } = useSaved()
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([])
  const [generating, setGenerating] = useState(false)
  const [detail, setDetail] = useState<GeneratedOutfit | null>(null)
  const [filterVibe, setFilterVibe] = useState<string>('all')

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const check = outfitReadyCheck(items)

  const allVibes = useMemo(() => {
    const vibes = new Set(outfits.map(o => o.dominantVibe).filter(Boolean) as string[])
    return ['all', ...vibes]
  }, [outfits])

  const filtered = useMemo(() =>
    filterVibe === 'all' ? outfits : outfits.filter(o => o.dominantVibe === filterVibe),
    [outfits, filterVibe]
  )

  const generate = useCallback(() => {
    setGenerating(true)
    setTimeout(() => {
      const pairings = storage.getPairings()
      setOutfits(generateOutfits(items, 12, pairings))
      setGenerating(false)
    }, 600)
  }, [items])

  if (!check.ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center gap-4 max-w-lg mx-auto">
        <span className="text-6xl">🔒</span>
        <h2 className="text-xl font-bold">Not quite ready</h2>
        <p className="text-sm text-neutral-400">{check.message}</p>
        <div className="flex gap-4 text-sm mt-2">
          {(['tops', 'bottoms', 'shoes'] as const).map(cat => (
            <div key={cat} className={`text-center ${(check[cat] ?? 0) >= 1 ? 'text-green-500' : 'text-neutral-400'}`}>
              <div className="text-2xl">{(check[cat] ?? 0) >= 1 ? '✅' : '❌'}</div>
              <div className="text-xs mt-1 capitalize">{cat}</div>
            </div>
          ))}
        </div>
        <Link to="/upload" className="mt-4 px-6 py-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-bold shadow-md">
          Add items
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto">
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">✨ Generate</h1>
          <p className="text-xs text-neutral-400 mt-0.5">AI-scored outfit combos from your closet</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={generate}
          disabled={generating}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-bold shadow-md disabled:opacity-60"
        >
          {generating ? '⏳' : outfits.length ? '🔁 Redo' : '🎲 Generate'}
        </motion.button>
      </div>

      {/* hero generate */}
      {outfits.length === 0 && !generating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mt-4 rounded-3xl border-2 border-dashed border-fuchsia-200 dark:border-fuchsia-900 p-8 text-center flex flex-col items-center gap-3"
        >
          <span className="text-5xl">🪄</span>
          <p className="font-bold text-lg">Ready to serve looks</p>
          <p className="text-sm text-neutral-400">Hit Generate — I'll build {12}+ scored outfit combos from your {items.length} items.</p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={generate}
            className="mt-2 px-8 py-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white font-bold text-sm shadow-lg"
          >
            🎲 Generate fits
          </motion.button>
        </motion.div>
      )}

      {generating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="text-4xl"
          >
            ✨
          </motion.span>
          <p className="text-sm text-neutral-400">Building your fits…</p>
        </div>
      )}

      {/* vibe filter */}
      {outfits.length > 0 && !generating && (
        <>
          <div className="flex gap-2 px-5 mb-4 overflow-x-auto no-scrollbar">
            {allVibes.map(v => (
              <button
                key={v}
                onClick={() => setFilterVibe(v)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all capitalize ${filterVibe === v ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-fuchsia-300'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="px-5 grid grid-cols-2 gap-3">
            <AnimatePresence>
              {filtered.map(outfit => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  itemMap={itemMap}
                  isSaved={isSaved(outfit.id)}
                  onSave={() => saveOutfit(outfit)}
                  onUnsave={() => unsaveOutfit(outfit.id)}
                  onClick={() => setDetail(outfit)}
                />
              ))}
            </AnimatePresence>
          </div>

          <p className="text-center text-xs text-neutral-400 py-6">
            {filtered.length} outfits · tap ❤️ to save
          </p>
        </>
      )}

      {/* detail modal */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl p-6 pb-12 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-xl">{detail.vibeName}</h3>
              </div>

              <div className="grid grid-cols-3 gap-1 mb-4 rounded-2xl overflow-hidden">
                {[detail.picks.top, detail.picks.outerwear, detail.picks.bottom, detail.picks.shoes, detail.picks.bag, detail.picks.accessory]
                  .filter(Boolean).map(id => {
                    const item = itemMap.get(id!)
                    if (!item) return null
                    return (
                      <div key={id} className="aspect-square bg-neutral-100 dark:bg-neutral-800">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )
                  })}
              </div>

              <div className="flex flex-col gap-2 mb-4">
                {[detail.picks.top, detail.picks.outerwear, detail.picks.bottom, detail.picks.shoes, detail.picks.bag, detail.picks.accessory]
                  .filter(Boolean).map(id => {
                    const item = itemMap.get(id!)
                    if (!item) return null
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-neutral-400 capitalize">{item.category}</p>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className="bg-fuchsia-50 dark:bg-fuchsia-950/30 rounded-2xl p-4 mb-4">
                <p className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 mb-1">Why it works</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{detail.reason}</p>
              </div>

              <button
                onClick={() => {
                  isSaved(detail.id) ? unsaveOutfit(detail.id) : saveOutfit(detail)
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white font-bold text-sm shadow-md"
              >
                {isSaved(detail.id) ? '💔 Remove from saved' : '❤️ Save this outfit'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
