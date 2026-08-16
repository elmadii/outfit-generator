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
const LABELS: Record<string, string> = { tops: 'Top', bottoms: 'Bottom', shoes: 'Shoes', bags: 'Bag' }

function scoreFromPicks(picks: OutfitPick, itemMap: Map<string, ClosetItem>): number {
  const colors = Object.values(picks).filter(Boolean).map(id => itemMap.get(id!)?.colors ?? [])
  return outfitColorScore(colors)
}

interface SlotRowProps {
  label: string
  items: ClosetItem[]
  index: number
  direction: number
  onPrev: () => void
  onNext: () => void
}

function SlotRow({ label, items, index, direction, onPrev, onNext }: SlotRowProps) {
  const item = items[index]
  if (!item) return null
  return (
    <div className="flex items-center gap-3 px-4 flex-1 min-h-0">
      <button onClick={onPrev} disabled={items.length <= 1} className="shrink-0 w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:border-neutral-400 transition-all disabled:opacity-20 active:scale-90">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <div className="relative overflow-hidden shrink-0" style={{ width: 72, height: 88, borderRadius: 12, background: '#f5f5f5' }}>
          <AnimatePresence custom={direction} mode="popLayout">
            <motion.img key={item.id} src={item.image} alt={item.name} custom={direction}
              variants={{ enter: (d: number) => ({ x: d * 60, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: -d * 60, opacity: 0 }) }}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute inset-0 w-full h-full object-cover"
              drag="x" dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => { if (info.offset.x > 40) onPrev(); else if (info.offset.x < -40) onNext() }}
            />
          </AnimatePresence>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-0.5">{label}</p>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{item.name}</p>
          {item.vibes.length > 0 && <p className="text-xs text-neutral-400 mt-0.5 truncate">{item.vibes.slice(0, 2).join(' · ')}</p>}
          {items.length > 1 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {items.slice(0, 10).map((_, i) => (
                <div key={i} className="rounded-full transition-all" style={{ width: i === index ? 14 : 5, height: 5, background: i === index ? '#d946ef' : '#e5e7eb' }} />
              ))}
            </div>
          )}
        </div>
      </div>
      <button onClick={onNext} disabled={items.length <= 1} className="shrink-0 w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:border-neutral-400 transition-all disabled:opacity-20 active:scale-90">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
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
    bottoms: items.filter(i => i.category === 'bottoms'),
    shoes: items.filter(i => i.category === 'shoes'),
    bags: items.filter(i => i.category === 'bags'),
  }), [items])
  const [indices, setIndices] = useState<Record<string, number>>({ tops: 0, bottoms: 0, shoes: 0, bags: 0 })
  const [directions, setDirections] = useState<Record<string, number>>({ tops: 1, bottoms: 1, shoes: 1, bags: 1 })
  const [showBag, setShowBag] = useState(false)
  const [saved, setSaved] = useState(false)

  const navigate = (cat: string, dir: 1 | -1) => {
    const list = byCategory[cat as keyof typeof byCategory]
    if (!list?.length) return
    setDirections(prev => ({ ...prev, [cat]: dir }))
    setIndices(prev => ({ ...prev, [cat]: (prev[cat] + dir + list.length) % list.length }))
    setSaved(false)
  }
  const shuffle = () => {
    const next: Record<string, number> = {}
    for (const cat of ['tops', 'bottoms', 'shoes', 'bags']) {
      const list = byCategory[cat as keyof typeof byCategory]
      next[cat] = list.length ? Math.floor(Math.random() * list.length) : 0
    }
    setIndices(next)
    setSaved(false)
  }
  const picks = useMemo<OutfitPick>(() => {
    const obj: OutfitPick = {}
    const top = byCategory.tops[indices.tops]
    const bottom = byCategory.bottoms[indices.bottoms]
    const shoe = byCategory.shoes[indices.shoes]
    const bag = byCategory.bags[indices.bags]
    if (top) obj.top = top.id
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
      <div className="h-screen flex flex-col items-center justify-center text-center px-8 gap-4 bg-white dark:bg-neutral-950">
        <span className="text-5xl">🎮</span>
        <p className="font-bold text-lg">Need a few more items</p>
        <p className="text-sm text-neutral-400">Missing: {missingCore.map(c => LABELS[c]).join(', ')}</p>
        <Link to="/upload" className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-bold shadow">Add items</Link>
      </div>
    )
  }
  const scoreColor = score >= 85 ? '#22c55e' : score >= 70 ? '#eab308' : '#f43f5e'
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 overflow-hidden max-w-lg mx-auto">
      <div className="flex items-center justify-between px-5 pt-10 pb-3 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Arcade</h1>
          <p className="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-widest">Mix & match</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tabular-nums" style={{ color: scoreColor }}>{score}</span>
          <button onClick={shuffle} className="w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-base hover:border-fuchsia-400 transition-colors active:scale-90">🎲</button>
        </div>
      </div>
      <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-5 shrink-0" />
      <div className="flex-1 flex flex-col justify-evenly py-2 min-h-0">
        {CORE_CATS.map(cat => (
          <SlotRow key={cat} label={LABELS[cat]} items={byCategory[cat]} index={indices[cat]} direction={directions[cat]} onPrev={() => navigate(cat, -1)} onNext={() => navigate(cat, 1)} />
        ))}
        <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-4 shrink-0" />
        {byCategory.bags.length > 0 ? (
          showBag ? (
            <>
              <SlotRow label={LABELS.bags} items={byCategory.bags} index={indices.bags} direction={directions.bags} onPrev={() => navigate('bags', -1)} onNext={() => navigate('bags', 1)} />
              <div className="flex justify-center shrink-0 pb-1">
                <button onClick={() => setShowBag(false)} className="text-xs text-neutral-300 hover:text-red-400 transition-colors">Remove bag</button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center px-4 flex-1 min-h-0">
              <button onClick={() => setShowBag(true)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700 text-sm text-neutral-400 hover:border-fuchsia-400 hover:text-fuchsia-500 transition-all">
                <span>+</span> Add a bag
              </button>
            </div>
          )
        ) : null}
      </div>
      <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-5 shrink-0" />
      <div className="flex gap-3 px-5 py-4 pb-28 shrink-0">
        <motion.button whileTap={{ scale: 0.93 }} onClick={saveCurrentOutfit} disabled={saved}
          className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm"
          style={{ background: saved ? '#22c55e' : 'linear-gradient(135deg, #d946ef, #f43f5e)', color: 'white' }}>
          {saved ? '✓ Saved' : '❤️ Save this fit'}
        </motion.button>
      </div>
    </div>
  )
}
