import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import { useSaved } from '../hooks/useSaved'
import { outfitColorScore } from '../lib/colorTheory'
import { storage } from '../lib/storage'
import type { ClosetItem, GeneratedOutfit, OutfitPick } from '../types'
import { v4 as uuid } from 'uuid'
import { Link } from 'react-router-dom'

const CORE_CATS = ['tops', 'bottoms', 'shoes'] as const
const LABELS: Record<string, string> = { tops: 'Top', outerwear: 'Outerwear', bottoms: 'Bottom', shoes: 'Shoes', bags: 'Bag' }

function scoreFromPicks(picks: OutfitPick, itemMap: Map<string, ClosetItem>): number {
  const colors = Object.values(picks).filter(Boolean).map(id => itemMap.get(id!)?.colors ?? [])
  return outfitColorScore(colors)
}

interface RowProps {
  label: string
  items: ClosetItem[]
  index: number
  direction: number
  onPrev: () => void
  onNext: () => void
}

function Row({ label, items, index, direction, onPrev, onNext }: RowProps) {
  const item = items[index]
  if (!item) return null
  return (
    <div className="flex-1 flex items-center gap-2 px-3 min-h-0">
      <button onClick={onPrev} disabled={items.length <= 1}
        className="shrink-0 w-8 h-8 flex items-center justify-center text-neutral-300 hover:text-neutral-600 disabled:opacity-10 transition-colors active:scale-90 text-xl">
        ‹
      </button>

      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-0 overflow-hidden">
        <div className="relative w-full flex-1 min-h-0">
          <AnimatePresence custom={direction} mode="popLayout">
            <motion.img
              key={item.id}
              src={item.image}
              alt={item.name}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 80, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: -d * 80, opacity: 0 }),
              }}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              drag="x" dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => { if (info.offset.x > 40) onPrev(); else if (info.offset.x < -40) onNext() }}
              className="absolute inset-0 w-full h-full object-contain select-none"
              style={{ background: 'transparent' }}
            />
          </AnimatePresence>
        </div>
        <div className="shrink-0 text-center pb-1">
          <p className="text-[9px] text-neutral-300 uppercase tracking-widest">{label}</p>
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate max-w-[140px]">{item.name}</p>
          {items.length > 1 && (
            <div className="flex gap-1 mt-1 justify-center">
              {items.slice(0, 8).map((_, i) => (
                <div key={i} className="rounded-full transition-all" style={{ width: i === index ? 12 : 4, height: 4, background: i === index ? '#d946ef' : '#e5e7eb' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={onNext} disabled={items.length <= 1}
        className="shrink-0 w-8 h-8 flex items-center justify-center text-neutral-300 hover:text-neutral-600 disabled:opacity-10 transition-colors active:scale-90 text-xl">
        ›
      </button>
    </div>
  )
}

export default function ArcadePage() {
  const { items } = useCloset()
  const { saveOutfit } = useSaved()
  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const byCategory = useMemo(() => ({
    tops: items.filter(i => i.category === 'tops'),
    outerwear: items.filter(i => i.category === 'outerwear'),
    bottoms: items.filter(i => i.category === 'bottoms'),
    shoes: items.filter(i => i.category === 'shoes'),
    bags: items.filter(i => i.category === 'bags'),
  }), [items])

  const [indices, setIndices] = useState<Record<string, number>>({ tops: 0, outerwear: 0, bottoms: 0, shoes: 0, bags: 0 })
  const [directions, setDirections] = useState<Record<string, number>>({ tops: 1, outerwear: 1, bottoms: 1, shoes: 1, bags: 1 })
  const [showOuter, setShowOuter] = useState(false)
  const [showBag, setShowBag] = useState(false)
  const [saved, setSaved] = useState(false)

  const navigate = (cat: string, dir: 1 | -1) => {
    const list = byCategory[cat as keyof typeof byCategory] as ClosetItem[]
    if (!list?.length) return
    setDirections(prev => ({ ...prev, [cat]: dir }))
    setIndices(prev => ({ ...prev, [cat]: (prev[cat] + dir + list.length) % list.length }))
    setSaved(false)
  }
  const shuffle = () => {
    const next: Record<string, number> = {}
    for (const cat of ['tops','outerwear','bottoms','shoes','bags']) {
      const list = byCategory[cat as keyof typeof byCategory] as ClosetItem[]
      next[cat] = list.length ? Math.floor(Math.random() * list.length) : 0
    }
    setIndices(next); setSaved(false)
  }
  const picks = useMemo<OutfitPick>(() => {
    const obj: OutfitPick = {}
    const top = byCategory.tops[indices.tops]
    const outer = byCategory.outerwear[indices.outerwear]
    const bottom = byCategory.bottoms[indices.bottoms]
    const shoe = byCategory.shoes[indices.shoes]
    const bag = byCategory.bags[indices.bags]
    if (top) obj.top = top.id
    if (showOuter && outer) obj.outerwear = outer.id
    if (bottom) obj.bottom = bottom.id
    if (shoe) obj.shoes = shoe.id
    if (showBag && bag) obj.bag = bag.id
    return obj
  }, [indices, byCategory, showBag])

  const score = useMemo(() => scoreFromPicks(picks, itemMap), [picks, itemMap])
  const saveCurrentOutfit = () => {
    const outfit: GeneratedOutfit = { id: uuid(), picks, score, vibeName: 'My Mix', reason: 'Hand-picked in the Arcade.', dominantVibe: null, createdAt: Date.now() }
    saveOutfit(outfit)
    storage.recordPairing(Object.values(picks).filter(Boolean) as string[])
    setSaved(true)
  }

  const missingCore = CORE_CATS.filter(cat => byCategory[cat].length === 0)
  if (missingCore.length > 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center px-8 gap-4 bg-white">
        <span className="text-5xl">🎮</span>
        <p className="font-bold text-lg">Need a few more items</p>
        <p className="text-sm text-neutral-400">Missing: {missingCore.map(c => LABELS[c]).join(', ')}</p>
        <Link to="/upload" className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-bold shadow">Add items</Link>
      </div>
    )
  }

  const totalRows = 3 + (showOuter && byCategory.outerwear.length > 0 ? 1 : 0) + (showBag && byCategory.bags.length > 0 ? 1 : 0)

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden max-w-lg mx-auto">
      {/* header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-2 shrink-0">
        <h1 className="text-base font-bold tracking-tight text-neutral-800">Arcade</h1>
        <div className="flex items-center gap-3">
          <button onClick={shuffle} className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-sm hover:border-fuchsia-400 transition-colors active:scale-90">🎲</button>
        </div>
      </div>

      {/* thin divider */}
      <div className="h-px bg-neutral-100 mx-5 shrink-0" />

      {/* rows */}
      <div className="flex-1 flex flex-col min-h-0" style={{ paddingBottom: totalRows === 4 ? 0 : 0 }}>
        {CORE_CATS.map((cat, i) => (
          <div key={cat} className="flex-1 flex flex-col min-h-0">
            <Row label={LABELS[cat]} items={byCategory[cat]} index={indices[cat]} direction={directions[cat]}
              onPrev={() => navigate(cat, -1)} onNext={() => navigate(cat, 1)} />
            {i < 2 && <div className="h-px bg-neutral-100 mx-10 shrink-0" />}
          </div>
        ))}

        {/* outerwear section */}
        {byCategory.outerwear.length > 0 && (
          <>
            <div className="h-px bg-neutral-100 mx-5 shrink-0" />
            {showOuter ? (
              <div className="flex-1 flex flex-col min-h-0">
                <Row label="Outerwear" items={byCategory.outerwear} index={indices.outerwear} direction={directions.outerwear}
                  onPrev={() => navigate('outerwear', -1)} onNext={() => navigate('outerwear', 1)} />
                <button onClick={() => setShowOuter(false)} className="text-[10px] text-neutral-300 hover:text-red-400 transition-colors pb-1 text-center shrink-0">remove outerwear</button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-3 shrink-0">
                <button onClick={() => setShowOuter(true)} className="text-xs text-neutral-400 hover:text-fuchsia-500 transition-colors flex items-center gap-1.5">
                  <span className="text-base leading-none">+</span> add outerwear
                </button>
              </div>
            )}
          </>
        )}

        {/* bag section */}
        {byCategory.bags.length > 0 && (
          <>
            <div className="h-px bg-neutral-100 mx-5 shrink-0" />
            {showBag ? (
              <div className="flex-1 flex flex-col min-h-0">
                <Row label="Bag" items={byCategory.bags} index={indices.bags} direction={directions.bags}
                  onPrev={() => navigate('bags', -1)} onNext={() => navigate('bags', 1)} />
                <button onClick={() => setShowBag(false)} className="text-[10px] text-neutral-300 hover:text-red-400 transition-colors pb-1 text-center shrink-0">remove bag</button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-3 shrink-0">
                <button onClick={() => setShowBag(true)} className="text-xs text-neutral-400 hover:text-fuchsia-500 transition-colors flex items-center gap-1.5">
                  <span className="text-base leading-none">+</span> add a bag
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* save */}
      <div className="px-5 py-3 pb-28 shrink-0">
        <motion.button whileTap={{ scale: 0.95 }} onClick={saveCurrentOutfit} disabled={saved}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all"
          style={{ background: saved ? '#22c55e' : 'linear-gradient(135deg, #d946ef, #f43f5e)' }}>
          {saved ? '✓ Saved' : '❤️ Save this fit'}
        </motion.button>
      </div>
    </div>
  )
}
