import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import { useSaved } from '../hooks/useSaved'
import { outfitColorScore } from '../lib/colorTheory'
import { storage } from '../lib/storage'
import type { ClosetItem, Category, GeneratedOutfit, OutfitPick } from '../types'
import { v4 as uuid } from 'uuid'

const STEPS: { cat: Category; label: string; emoji: string }[] = [
  { cat: 'tops', label: 'Tops', emoji: '👕' },
  { cat: 'bottoms', label: 'Bottoms', emoji: '👖' },
  { cat: 'shoes', label: 'Shoes', emoji: '👟' },
  { cat: 'bags', label: 'Bags', emoji: '👜' },
  { cat: 'accessories', label: 'Accessories', emoji: '💍' },
]

function scoreFromPicks(picks: OutfitPick, itemMap: Map<string, ClosetItem>): number {
  const colors = Object.values(picks)
    .filter(Boolean)
    .map(id => itemMap.get(id!)?.colors ?? [])
  return outfitColorScore(colors)
}

export default function ArcadePage() {
  const { items } = useCloset()
  const { saveOutfit } = useSaved()

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  const stepItems = useMemo(() =>
    STEPS.map(s => ({
      ...s,
      items: items.filter(i => i.category === s.cat),
    })).filter(s => s.items.length > 0),
    [items]
  )

  const [stepIdx, setStepIdx] = useState(0)
  const [indices, setIndices] = useState<Record<string, number>>({})
  const [direction, setDirection] = useState(1)
  const [saved, setSaved] = useState(false)

  const curStep = stepItems[stepIdx]
  const curItemIdx = indices[curStep?.cat ?? ''] ?? 0
  const curItem = curStep?.items[curItemIdx]

  const picks = useMemo<OutfitPick>(() => {
    const obj: OutfitPick = {}
    for (const s of stepItems) {
      const idx = indices[s.cat] ?? 0
      const item = s.items[idx]
      if (!item) continue
      if (s.cat === 'tops') obj.top = item.id
      else if (s.cat === 'bottoms') obj.bottom = item.id
      else if (s.cat === 'shoes') obj.shoes = item.id
      else if (s.cat === 'bags') obj.bag = item.id
      else if (s.cat === 'accessories') obj.accessory = item.id
    }
    return obj
  }, [indices, stepItems])

  const score = useMemo(() => scoreFromPicks(picks, itemMap), [picks, itemMap])

  const navigate = (dir: 1 | -1) => {
    if (!curStep) return
    setDirection(dir)
    const list = curStep.items
    const next = (curItemIdx + dir + list.length) % list.length
    setIndices(prev => ({ ...prev, [curStep.cat]: next }))
    setSaved(false)
  }

  const shuffle = () => {
    const next: Record<string, number> = {}
    for (const s of stepItems) next[s.cat] = Math.floor(Math.random() * s.items.length)
    setIndices(next)
    setSaved(false)
  }

  const saveCurrentOutfit = () => {
    const outfit: GeneratedOutfit = {
      id: uuid(),
      picks,
      score,
      vibeName: 'My Mix',
      reason: 'Hand-picked in the Arcade.',
      dominantVibe: null,
      createdAt: Date.now(),
    }
    saveOutfit(outfit)
    storage.recordPairing(Object.values(picks).filter(Boolean) as string[])
    setSaved(true)
  }

  const pickedItems = useMemo(() =>
    Object.values(picks).filter(Boolean).map(id => itemMap.get(id!)).filter(Boolean) as ClosetItem[],
    [picks, itemMap]
  )

  if (items.length < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 gap-4">
        <span className="text-6xl">🎮</span>
        <p className="font-bold text-lg">Arcade needs more items</p>
        <p className="text-sm text-neutral-400">Add at least a top, bottom, and shoes to play.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto">
      <div className="px-5 pt-12 pb-3">
        <h1 className="text-2xl font-extrabold tracking-tight">🎮 Arcade</h1>
        <p className="text-xs text-neutral-400 mt-0.5">Swipe through categories to build your fit</p>
      </div>

      {/* category tabs */}
      <div className="flex gap-2 px-5 mb-4 overflow-x-auto no-scrollbar">
        {stepItems.map((s, i) => (
          <button
            key={s.cat}
            onClick={() => setStepIdx(i)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${i === stepIdx ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-fuchsia-300'}`}
          >
            {s.emoji} {s.label}
            <span className={`text-[9px] rounded-full px-1 ${i === stepIdx ? 'bg-white/30' : 'bg-neutral-200 dark:bg-neutral-700'}`}>{s.items.length}</span>
          </button>
        ))}
      </div>

      {/* main card swiper */}
      {curStep && (
        <div className="px-5 mb-5">
          <div className="relative overflow-hidden rounded-3xl aspect-square bg-neutral-100 dark:bg-neutral-800">
            <AnimatePresence custom={direction} mode="popLayout">
              {curItem && (
                <motion.div
                  key={curItem.id}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ x: d * 300, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (d: number) => ({ x: -d * 300, opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 60) navigate(-1)
                    else if (info.offset.x < -60) navigate(1)
                  }}
                  className="absolute inset-0"
                >
                  <img src={curItem.image} alt={curItem.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white font-bold text-base">{curItem.name}</p>
                    {curItem.vibes.length > 0 && (
                      <p className="text-white/70 text-xs">{curItem.vibes.join(' · ')}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* item nav */}
          <div className="flex items-center justify-between mt-3">
            <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 shadow-md flex items-center justify-center text-xl border border-neutral-100 dark:border-neutral-700">
              ←
            </button>
            <div className="text-center">
              <p className="text-xs text-neutral-400">{curItemIdx + 1} / {curStep.items.length}</p>
              <div className="flex gap-1 mt-1 justify-center">
                {curStep.items.slice(0, 8).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === curItemIdx ? 'bg-fuchsia-500 w-3' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                ))}
              </div>
            </div>
            <button onClick={() => navigate(1)} className="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 shadow-md flex items-center justify-center text-xl border border-neutral-100 dark:border-neutral-700">
              →
            </button>
          </div>
        </div>
      )}

      {/* current outfit strip */}
      <div className="px-5">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Current Fit</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${score >= 85 ? 'text-green-500' : score >= 70 ? 'text-yellow-500' : 'text-rose-400'}`}>
                {score}/100
              </span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
            {pickedItems.map(item => (
              <div key={item.id} className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mb-3 truncate">
            {pickedItems.map(i => i.name).join(' + ')}
          </p>
          <div className="flex gap-2">
            <button onClick={shuffle} className="flex-1 py-2.5 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-sm font-semibold hover:border-fuchsia-300 transition-colors">
              🎲 Shuffle
            </button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={saveCurrentOutfit}
              disabled={saved}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-md'}`}
            >
              {saved ? '✅ Saved!' : '❤️ Save fit'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
