import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
  { key: 'accessories', label: 'Acc.',      emoji: '⌚' },
] as const

type SlotKey = typeof SLOTS[number]['key']

// Default canvas positions per category (left%, top%, width% relative to canvas)
const DEFAULT_POS: Record<string, { left: number; top: number; width: number; zIndex: number }> = {
  layer:       { left: 8,  top: 0,  width: 76, zIndex: 1 },
  tops:        { left: 16, top: 6,  width: 62, zIndex: 2 },
  bottoms:     { left: 14, top: 38, width: 66, zIndex: 0 },
  shoes:       { left: 20, top: 68, width: 55, zIndex: 3 },
  bags:        { left: 56, top: 28, width: 35, zIndex: 4 },
  accessories: { left: 3,  top: 4,  width: 20, zIndex: 5 },
}

type CanvasPos = { left: number; top: number; width: number; zIndex: number; cat: string }

const BACKGROUNDS = ['#FFFFFF', '#F7F3EE', '#0F0C09', '#1a1a2e']

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

  const availableSlots = SLOTS.filter(s => byCategory[s.key].length > 0)

  const [picks, setPicks] = useState<Record<string, string | null>>(
    Object.fromEntries(SLOTS.map(s => [s.key, null]))
  )
  const [swipeIdx, setSwipeIdx] = useState<Record<string, number>>(
    Object.fromEntries(SLOTS.map(s => [s.key, 0]))
  )
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null)
  const [canvasItems, setCanvasItems] = useState<Record<string, CanvasPos>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bg, setBg] = useState(BACKGROUNDS[0])
  const [saved, setSaved] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    initLeft: number
    initTop: number
    moved: boolean
  } | null>(null)

  // ── Slot actions ──────────────────────────────────────────────────
  function openPicker(cat: SlotKey) {
    setActiveSlot(cat)
    setShowPicker(true)
  }

  function pickItem(cat: SlotKey, itemId: string) {
    const prevId = picks[cat]
    setPicks(prev => ({ ...prev, [cat]: itemId }))
    setCanvasItems(prev => {
      const next = { ...prev }
      if (prevId) delete next[prevId]
      next[itemId] = { ...(DEFAULT_POS[cat] ?? { left: 20, top: 20, width: 60, zIndex: 2 }), cat }
      return next
    })
    setSaved(false)
    setShowPicker(false)
  }

  function swipeSlot(cat: SlotKey, dir: 1 | -1) {
    const list = byCategory[cat]
    if (!list.length) return
    const nextIdx = (swipeIdx[cat] + dir + list.length) % list.length
    setSwipeIdx(prev => ({ ...prev, [cat]: nextIdx }))
    pickItem(cat, list[nextIdx].id)
  }

  function clearSlot(cat: string) {
    const prevId = picks[cat]
    setPicks(prev => ({ ...prev, [cat]: null }))
    if (prevId) setCanvasItems(prev => { const n = { ...prev }; delete n[prevId]; return n })
    if (selectedId === prevId) setSelectedId(null)
    setSaved(false)
  }

  function resetAll() {
    setPicks(Object.fromEntries(SLOTS.map(s => [s.key, null])))
    setCanvasItems({})
    setSelectedId(null)
    setSaved(false)
  }

  // ── Drag ──────────────────────────────────────────────────────────
  function onItemPointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const pos = canvasItems[id]
    const bounds = canvas.getBoundingClientRect()
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initLeft: (pos.left / 100) * bounds.width,
      initTop: (pos.top / 100) * bounds.height,
      moved: false,
    }
  }

  function onItemPointerMove(e: React.PointerEvent, id: string) {
    const d = dragRef.current
    if (!d || d.id !== id) return
    const canvas = canvasRef.current
    if (!canvas) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) > 5) d.moved = true
    if (!d.moved) return
    const bounds = canvas.getBoundingClientRect()
    setCanvasItems(prev => ({
      ...prev,
      [id]: { ...prev[id], left: (d.initLeft + dx) / bounds.width * 100, top: (d.initTop + dy) / bounds.height * 100 },
    }))
  }

  function onItemPointerUp(e: React.PointerEvent, id: string) {
    const d = dragRef.current
    if (!d || d.id !== id) return
    if (!d.moved) setSelectedId(prev => prev === id ? null : id)
    dragRef.current = null
  }

  // ── Scale selected item ───────────────────────────────────────────
  function scaleSelected(delta: number) {
    if (!selectedId) return
    setCanvasItems(prev => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], width: Math.max(12, Math.min(130, prev[selectedId].width + delta)) },
    }))
  }

  // ── Pinch zoom on canvas items ────────────────────────────────────
  const pinchRef = useRef<{ dist: number; initWidth: number; id: string } | null>(null)

  function onTouchStart(e: React.TouchEvent, id: string) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { dist: Math.hypot(dx, dy), initWidth: canvasItems[id]?.width ?? 60, id }
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const p = pinchRef.current
    if (!p || e.touches.length < 2) return
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const newWidth = Math.max(12, Math.min(130, p.initWidth * (dist / p.dist)))
    setCanvasItems(prev => ({ ...prev, [p.id]: { ...prev[p.id], width: newWidth } }))
  }

  // ── Save ─────────────────────────────────────────────────────────
  const filledCount = Object.values(picks).filter(Boolean).length

  function saveCurrentOutfit() {
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
      vibeName: 'My Mix', reason: 'Hand-picked in the Builder.',
      dominantVibe: null, createdAt: Date.now(),
    }
    saveOutfit(outfit)
    storage.recordPairing(Object.values(picks).filter(Boolean) as string[])
    setSaved(true)
  }

  // Not enough items
  const missingCore = ['tops', 'bottoms', 'shoes'].filter(cat => byCategory[cat as SlotKey].length === 0)
  if (missingCore.length > 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center px-8 gap-4 bg-[#F7F3EE]">
        <span className="text-5xl">🎮</span>
        <p className="font-bold text-lg text-stone-800">Need a few more items</p>
        <p className="text-sm text-stone-400">Missing: {missingCore.map(c => SLOTS.find(s => s.key === c)?.label).join(', ')}</p>
        <Link to="/upload" className="mt-2 px-6 py-2.5 rounded-full bg-fuchsia-500 text-white text-sm font-bold shadow-md">Add items</Link>
      </div>
    )
  }

  const activeList = activeSlot ? byCategory[activeSlot] : []
  const activeIdx  = activeSlot ? swipeIdx[activeSlot] : 0

  return (
    <div className="h-screen flex flex-col bg-[#F7F3EE] dark:bg-stone-950 overflow-hidden max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-10 pb-2 shrink-0">
        <div>
          <h1 className="text-base font-bold text-stone-800 dark:text-stone-100">Build Your Look</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {filledCount === 0 ? 'Tap a slot to add a piece' : `${filledCount} piece${filledCount > 1 ? 's' : ''} on canvas`}
          </p>
        </div>
        {filledCount > 0 && (
          <button onClick={resetAll} className="text-xs text-stone-400 hover:text-red-400 transition-colors">Reset</button>
        )}
      </div>

      {/* ── Slot strip ── */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {availableSlots.map(s => {
            const pickedItem = picks[s.key] ? itemMap.get(picks[s.key]!) : null
            const isActive = activeSlot === s.key && showPicker
            return (
              <div key={s.key} className="shrink-0 relative">
                <button
                  onClick={() => openPicker(s.key)}
                  className={[
                    'w-14 h-[72px] rounded-xl overflow-hidden flex flex-col transition-all border-2',
                    isActive
                      ? 'border-fuchsia-500 shadow-md'
                      : pickedItem
                        ? 'border-stone-100 shadow-sm'
                        : 'border-dashed border-stone-300',
                  ].join(' ')}
                >
                  {pickedItem ? (
                    <div className="flex-1 bg-white relative">
                      <img src={pickedItem.image} alt={pickedItem.name} className="w-full h-full object-contain" />
                      <div className="absolute bottom-0 inset-x-0 bg-stone-900/75 py-0.5">
                        <p className="text-[7px] font-bold text-white text-center uppercase tracking-wider">{s.label}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-white/60">
                      <span className="text-base">{s.emoji}</span>
                      <p className="text-[8px] text-stone-400 font-semibold">{s.label}</p>
                      <p className="text-stone-300 text-[10px] leading-none">+</p>
                    </div>
                  )}
                </button>
                {pickedItem && (
                  <button
                    onClick={e => { e.stopPropagation(); clearSlot(s.key) }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-600 text-white text-[9px] flex items-center justify-center shadow z-10"
                  >×</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 mx-4 mb-2 min-h-0 relative" style={{ touchAction: 'none' }}>
        <div
          ref={canvasRef}
          className="h-full w-full rounded-2xl overflow-hidden relative shadow-sm border border-stone-200 dark:border-stone-700"
          style={{ background: bg, touchAction: 'none' }}
          onClick={() => setSelectedId(null)}
          onTouchMove={onTouchMove}
        >
          {filledCount === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <span className="text-4xl opacity-30">👆</span>
              <p className="text-sm text-stone-400 opacity-60">Tap a slot above to start</p>
            </div>
          )}

          {Object.entries(canvasItems).map(([id, pos]) => {
            const item = itemMap.get(id)
            if (!item) return null
            const isSelected = selectedId === id

            return (
              <div
                key={id}
                style={{
                  position: 'absolute',
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  width: `${pos.width}%`,
                  zIndex: isSelected ? 100 : pos.zIndex,
                  cursor: 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                onPointerDown={e => onItemPointerDown(e, id)}
                onPointerMove={e => onItemPointerMove(e, id)}
                onPointerUp={e => onItemPointerUp(e, id)}
                onTouchStart={e => onTouchStart(e, id)}
                onClick={e => e.stopPropagation()}
              >
                {isSelected && (
                  <div className="absolute -inset-1 rounded-lg border-2 border-fuchsia-400 pointer-events-none" />
                )}
                <img
                  src={item.image}
                  alt={item.name}
                  draggable={false}
                  className="w-full h-auto object-contain select-none"
                  style={{ pointerEvents: 'none' }}
                />
              </div>
            )
          })}
        </div>

        {/* Active slot cycle arrows (when picker closed but slot active) */}
        {activeSlot && !showPicker && picks[activeSlot] && activeList.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); swipeSlot(activeSlot, -1) }}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-stone-600 text-lg z-20 active:scale-90"
            >‹</button>
            <button
              onClick={e => { e.stopPropagation(); swipeSlot(activeSlot, 1) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-stone-600 text-lg z-20 active:scale-90"
            >›</button>
          </>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="px-4 pb-2 shrink-0 flex items-center gap-3">
        {/* Background picker */}
        <div className="flex gap-1.5 items-center">
          {BACKGROUNDS.map(c => (
            <button
              key={c}
              onClick={() => setBg(c)}
              className="w-5 h-5 rounded-full border-2 transition-all"
              style={{
                background: c,
                borderColor: bg === c ? '#7B3428' : '#d1d5db',
                boxShadow: bg === c ? '0 0 0 1px #7B3428' : 'none',
              }}
            />
          ))}
        </div>

        <div className="flex-1" />

        {/* Scale selected item */}
        {selectedId && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => scaleSelected(-5)}
              className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-base flex items-center justify-center font-bold"
            >−</button>
            <span className="text-[10px] text-stone-400 w-6 text-center">size</span>
            <button
              onClick={() => scaleSelected(5)}
              className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-base flex items-center justify-center font-bold"
            >+</button>
          </div>
        )}
      </div>

      {/* ── Save button ── */}
      <div className="px-4 pb-28 shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={saveCurrentOutfit}
          disabled={filledCount < 2 || saved}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all"
          style={{
            background: saved ? '#22c55e' : filledCount < 2 ? '#d1d5db' : '#7B3428',
          }}
        >
          {saved ? '✓ Saved!' : filledCount < 2 ? 'Pick at least 2 pieces' : '❤️ Save this look'}
        </motion.button>
      </div>

      {/* ── Item Picker Bottom Sheet ── */}
      <AnimatePresence>
        {showPicker && activeSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setShowPicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl pb-10"
            >
              <div className="w-10 h-1 bg-stone-200 dark:bg-stone-700 rounded-full mx-auto mt-3 mb-4" />

              <div className="px-4 mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {SLOTS.find(s => s.key === activeSlot)?.emoji} Pick {SLOTS.find(s => s.key === activeSlot)?.label}
                </p>
                <button onClick={() => setShowPicker(false)} className="text-xs text-stone-400">Done</button>
              </div>

              {/* Swipe row */}
              <div className="flex items-center gap-3 px-4">
                <button
                  onClick={() => swipeSlot(activeSlot, -1)}
                  disabled={activeList.length <= 1}
                  className="shrink-0 w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 text-xl disabled:opacity-20"
                >‹</button>

                <div className="flex-1">
                  {activeList[activeIdx] && (
                    <motion.div
                      key={activeList[activeIdx].id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800 rounded-2xl p-3 cursor-pointer"
                      onClick={() => activeSlot && pickItem(activeSlot, activeList[activeIdx].id)}
                    >
                      <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0">
                        <img src={activeList[activeIdx].image} alt={activeList[activeIdx].name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">{activeList[activeIdx].name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{activeIdx + 1} / {activeList.length}</p>
                        <p className="text-xs text-fuchsia-500 mt-1.5 font-semibold">Tap to add →</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <button
                  onClick={() => swipeSlot(activeSlot, 1)}
                  disabled={activeList.length <= 1}
                  className="shrink-0 w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 text-xl disabled:opacity-20"
                >›</button>
              </div>

              {/* Dot indicator */}
              {activeList.length > 1 && (
                <div className="flex gap-1 mt-3 justify-center">
                  {activeList.slice(0, 10).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all"
                      style={{ width: i === activeIdx ? 14 : 4, height: 4, background: i === activeIdx ? '#7B3428' : '#e5e7eb' }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
