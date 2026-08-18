import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import { useSaved } from '../hooks/useSaved'
import { outfitColorScore } from '../lib/colorTheory'
import { storage } from '../lib/storage'
import type { ClosetItem, GeneratedOutfit, OutfitPick } from '../types'
import { v4 as uuid } from 'uuid'
import { Link } from 'react-router-dom'

const SLOTS = [
  { key: 'tops',        label: 'Top',       emoji: '👕' },
  { key: 'bottoms',     label: 'Bottom',    emoji: '👖' },
  { key: 'shoes',       label: 'Shoes',     emoji: '👟' },
  { key: 'layer',       label: 'Layer',     emoji: '🧥' },
  { key: 'bags',        label: 'Bag',       emoji: '👜' },
  { key: 'accessories', label: 'Accessory', emoji: '⌚' },
] as const

type SlotKey = typeof SLOTS[number]['key']

export default function ArcadePage() {
  const { items } = useCloset()
  const { saveOutfit } = useSaved()
  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  const byCategory = useMemo(() => ({
    tops:        items.filter(i => i.category === 'tops'),
    layer:       items.filter(i => i.category === 'layer'),
    bottoms:     items.filter(i => i.category === 'bottoms'),
    shoes:       items.filter(i => i.category === 'shoes'),
    bags:        items.filter(i => i.category === 'bags'),
    accessories: items.filter(i => i.category === 'accessories'),
  }), [items])

  // Only show slots that have items
  const availableSlots = SLOTS.filter(s => byCategory[s.key].length > 0)

  // Picks — all start null (empty outfit)
  const [picks, setPicks] = useState<Record<string, string | null>>(
    Object.fromEntries(SLOTS.map(s => [s.key, null]))
  )
  // Which slot is being actively swiped
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null)
  // Swipe position per slot
  const [swipeIdx, setSwipeIdx] = useState<Record<string, number>>(
    Object.fromEntries(SLOTS.map(s => [s.key, 0]))
  )
  const [swipeDir, setSwipeDir] = useState<Record<string, number>>(
    Object.fromEntries(SLOTS.map(s => [s.key, 1]))
  )
  const [saved, setSaved] = useState(false)

  const swipeSlot = (cat: string, dir: 1 | -1) => {
    const list = byCategory[cat as SlotKey]
    if (!list.length) return
    const nextIdx = (swipeIdx[cat] + dir + list.length) % list.length
    setSwipeIdx(prev => ({ ...prev, [cat]: nextIdx }))
    setSwipeDir(prev => ({ ...prev, [cat]: dir }))
    setPicks(prev => ({ ...prev, [cat]: list[nextIdx].id }))
    setSaved(false)
  }

  const activateSlot = (cat: SlotKey) => {
    setActiveSlot(cat)
    const list = byCategory[cat]
    if (list.length && !picks[cat]) {
      // Auto-pick first item when entering an empty slot
      setPicks(prev => ({ ...prev, [cat]: list[swipeIdx[cat]].id }))
    }
  }

  const clearSlot = (cat: string) => {
    setPicks(prev => ({ ...prev, [cat]: null }))
    setSaved(false)
  }

  const resetAll = () => {
    setPicks(Object.fromEntries(SLOTS.map(s => [s.key, null])))
    setActiveSlot(null)
    setSaved(false)
  }

  // Keyboard navigation: ← → to cycle, 1-6 to activate slots
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeSlot) { e.preventDefault(); swipeSlot(activeSlot, -1) }
      if (e.key === 'ArrowRight' && activeSlot) { e.preventDefault(); swipeSlot(activeSlot, 1) }
      const slotIndex = parseInt(e.key) - 1
      if (slotIndex >= 0 && slotIndex < availableSlots.length) activateSlot(availableSlots[slotIndex].key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeSlot, availableSlots, swipeIdx])

  const filledCount = Object.values(picks).filter(Boolean).length

  const saveCurrentOutfit = () => {
    const colorLists = Object.values(picks).filter(Boolean).map(id => itemMap.get(id!)?.colors ?? [])
    const score = outfitColorScore(colorLists)
    const outfitPicks: OutfitPick = {}
    if (picks.tops)        outfitPicks.top       = picks.tops!
    if (picks.layer)       outfitPicks.layer     = picks.layer!
    if (picks.bottoms)     outfitPicks.bottom    = picks.bottoms!
    if (picks.shoes)       outfitPicks.shoes     = picks.shoes!
    if (picks.bags)        outfitPicks.bag       = picks.bags!
    if (picks.accessories) outfitPicks.accessory = picks.accessories!
    const outfit: GeneratedOutfit = {
      id: uuid(), picks: outfitPicks, score,
      vibeName: 'My Mix', reason: 'Hand-picked in the Arcade.',
      dominantVibe: null, createdAt: Date.now(),
    }
    saveOutfit(outfit)
    storage.recordPairing(Object.values(picks).filter(Boolean) as string[])
    setSaved(true)
  }

  // Not enough items
  const missingCore = ['tops', 'bottoms', 'shoes'].filter(
    cat => byCategory[cat as SlotKey].length === 0
  )
  if (missingCore.length > 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center px-8 gap-4 bg-[#F7F3EE]">
        <span className="text-5xl">🎮</span>
        <p className="font-bold text-lg text-stone-800">Need a few more items</p>
        <p className="text-sm text-stone-400">
          Missing: {missingCore.map(c => SLOTS.find(s => s.key === c)?.label).join(', ')}
        </p>
        <Link to="/upload" className="mt-2 px-6 py-2.5 rounded-full bg-fuchsia-500 text-white text-sm font-bold shadow-md">
          Add items
        </Link>
      </div>
    )
  }

  const activeList: ClosetItem[] = activeSlot ? byCategory[activeSlot] : []
  const activeIdx  = activeSlot ? swipeIdx[activeSlot] : 0
  const activeDir  = activeSlot ? swipeDir[activeSlot] : 1
  const activeItem = activeList[activeIdx]

  return (
    <div className="h-screen flex flex-col bg-[#F7F3EE] overflow-hidden max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-10 pb-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-stone-800">Build Your Look</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {filledCount === 0 ? 'Tap a slot below to start' : `${filledCount} piece${filledCount > 1 ? 's' : ''} added`}
          </p>
        </div>
        {filledCount > 0 && (
          <button onClick={resetAll} className="text-xs text-stone-400 hover:text-red-400 transition-colors">
            Reset
          </button>
        )}
      </div>

      {/* ── Slot strip (outfit preview + selector) ── */}
      <div className="px-5 pb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {availableSlots.map(s => {
            const pickedItem = picks[s.key] ? itemMap.get(picks[s.key]!) : null
            const isActive   = activeSlot === s.key

            return (
              <div key={s.key} className="shrink-0 relative">
                <button
                  onClick={() => activateSlot(s.key)}
                  className={[
                    'w-16 h-[84px] rounded-2xl overflow-hidden flex flex-col transition-all border-2',
                    isActive
                      ? 'border-fuchsia-500 shadow-md'
                      : pickedItem
                        ? 'border-stone-100 shadow-sm'
                        : 'border-dashed border-stone-300',
                  ].join(' ')}
                >
                  {pickedItem ? (
                    <div className="flex-1 bg-white relative">
                      <img
                        src={pickedItem.image}
                        alt={pickedItem.name}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-stone-900/75 py-0.5">
                        <p className="text-[8px] font-bold text-white text-center uppercase tracking-wider">
                          {s.label}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-1 bg-white/60">
                      <span className="text-lg">{s.emoji}</span>
                      <p className="text-[9px] text-stone-400 font-semibold">{s.label}</p>
                      <p className="text-stone-300 text-xs leading-none">+</p>
                    </div>
                  )}
                </button>

                {/* Clear × button */}
                {pickedItem && (
                  <button
                    onClick={e => { e.stopPropagation(); clearSlot(s.key) }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-600 text-white text-[10px] font-bold flex items-center justify-center shadow z-10"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Swipe area ── */}
      <div className="flex-1 mx-5 mb-3 min-h-0">
        {!activeSlot ? (
          /* Initial empty state */
          <div className="h-full rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-3 bg-white/40">
            <span className="text-5xl">👆</span>
            <p className="text-sm font-semibold text-stone-500">Tap a slot to start building</p>
            <p className="text-xs text-stone-400">Pick Top, Bottom, Shoes — in any order</p>
          </div>
        ) : activeList.length > 0 ? (
          <div className="h-full bg-white rounded-3xl overflow-hidden flex flex-col shadow-sm border border-stone-100">

            {/* Slot label + count */}
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-stone-50">
              <div className="flex items-center gap-2">
                <span className="text-base">{SLOTS.find(s => s.key === activeSlot)?.emoji}</span>
                <p className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  {SLOTS.find(s => s.key === activeSlot)?.label}
                </p>
              </div>
              <p className="text-[11px] text-stone-400">
                {activeIdx + 1} / {activeList.length}
                {picks[activeSlot] && <span className="text-fuchsia-500 font-semibold"> · ✓ added</span>}
              </p>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center min-h-0 gap-2 px-2">
              <button
                onClick={() => swipeSlot(activeSlot, -1)}
                disabled={activeList.length <= 1}
                className="shrink-0 w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors text-xl active:scale-90"
              >
                ‹
              </button>

              <div className="flex-1 relative h-full">
                <AnimatePresence custom={activeDir} mode="popLayout">
                  <motion.img
                    key={activeItem?.id}
                    src={activeItem?.image}
                    alt={activeItem?.name}
                    custom={activeDir}
                    variants={{
                      enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                      center:               { x: 0, opacity: 1 },
                      exit:  (d: number) => ({ x: -d * 60, opacity: 0 }),
                    }}
                    initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x >  40) swipeSlot(activeSlot, -1)
                      if (info.offset.x < -40) swipeSlot(activeSlot,  1)
                    }}
                    className="absolute inset-0 w-full h-full object-contain select-none"
                    style={{ cursor: 'grab' }}
                  />
                </AnimatePresence>
              </div>

              <button
                onClick={() => swipeSlot(activeSlot, 1)}
                disabled={activeList.length <= 1}
                className="shrink-0 w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors text-xl active:scale-90"
              >
                ›
              </button>
            </div>

            {/* Item name + dots */}
            <div className="shrink-0 text-center px-4 py-3">
              <p className="text-sm font-semibold text-stone-700 truncate">{activeItem?.name}</p>
              {activeList.length > 1 && (
                <div className="flex gap-1 mt-2 justify-center">
                  {activeList.slice(0, 9).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all"
                      style={{
                        width:  i === activeIdx ? 14 : 4,
                        height: 4,
                        background: i === activeIdx ? '#7B3428' : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full rounded-3xl border-2 border-dashed border-stone-200 flex items-center justify-center">
            <p className="text-sm text-stone-400">No items in this category</p>
          </div>
        )}
      </div>

      {/* ── Save button ── */}
      <div className="px-5 pb-28 shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={saveCurrentOutfit}
          disabled={filledCount < 2 || saved}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all active:scale-95"
          style={{
            background: saved
              ? '#22c55e'
              : filledCount < 2
                ? '#d1d5db'
                : '#7B3428',
          }}
        >
          {saved
            ? '✓ Saved!'
            : filledCount < 2
              ? 'Pick at least 2 pieces'
              : '❤️ Save this look'}
        </motion.button>
      </div>
    </div>
  )
}
