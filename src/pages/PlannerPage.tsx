import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSaved } from '../hooks/useSaved'
import { useCloset } from '../hooks/useCloset'
import { storage, initStorage } from '../lib/storage'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDays(anchor: Date): Date[] {
  const dow = anchor.getDay()
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startOffset = (first.getDay() + 6) % 7 // Mon=0
  const cells: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function PlannerPage() {
  const { saved } = useSaved()
  const { items } = useCloset()
  const [view, setView] = useState<'week' | 'month'>('week')
  const [cursor, setCursor] = useState(new Date())
  const [planner, setPlanner] = useState<Record<string, string>>({})
  const [picking, setPicking] = useState<string | null>(null)

  useEffect(() => {
    initStorage().then(() => setPlanner(storage.getPlanner()))
  }, [])

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const savedMap = useMemo(() => new Map(saved.map(s => [s.id, s])), [saved])

  const today = toDateStr(new Date())

  const assign = (date: string, outfitId: string) => {
    storage.setPlannerEntry(date, outfitId)
    setPlanner(p => ({ ...p, [date]: outfitId }))
    setPicking(null)
  }

  const remove = (date: string) => {
    storage.removePlannerEntry(date)
    setPlanner(p => { const n = { ...p }; delete n[date]; return n })
  }

  const navigate = (dir: -1 | 1) => {
    const d = new Date(cursor)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCursor(d)
  }

  const weekDays = useMemo(() => getWeekDays(cursor), [cursor])
  const monthCells = useMemo(() => getMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const thumbFor = (outfitId: string): string | null => {
    const outfit = savedMap.get(outfitId)
    if (!outfit) return null
    const topId = outfit.picks.top ?? outfit.picks.bottom ?? outfit.picks.shoes
    return topId ? (itemMap.get(topId)?.image ?? null) : null
  }

  const nameFor = (outfitId: string) => savedMap.get(outfitId)?.vibeName ?? 'Outfit'

  const headerLabel = view === 'week'
    ? `${weekDays[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
    : `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`

  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto">
      {/* header */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">📅 Planner</h1>
        <div className="flex gap-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full p-1">
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${view === 'week' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-800 dark:text-white' : 'text-neutral-400'}`}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${view === 'month' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-800 dark:text-white' : 'text-neutral-400'}`}
          >
            Month
          </button>
        </div>
      </div>

      {/* nav row */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-lg leading-none hover:border-fuchsia-400 transition-colors"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{headerLabel}</p>
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-lg leading-none hover:border-fuchsia-400 transition-colors"
        >
          ›
        </button>
      </div>

      {/* week view */}
      {view === 'week' && (
        <div className="px-4 flex flex-col gap-2">
          {weekDays.map((d, i) => {
            const dateStr = toDateStr(d)
            const outfitId = planner[dateStr]
            const hasOutfit = outfitId && savedMap.has(outfitId)
            const isToday = dateStr === today
            return (
              <div
                key={dateStr}
                className={`flex items-center gap-3 rounded-2xl p-3 border transition-colors ${
                  isToday
                    ? 'bg-fuchsia-50 dark:bg-fuchsia-950/30 border-fuchsia-200 dark:border-fuchsia-800'
                    : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'
                }`}
              >
                <div className="shrink-0 w-12 text-center">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-fuchsia-500' : 'text-neutral-400'}`}>
                    {DAY_LABELS[i]}
                  </p>
                  <p className={`text-xl font-extrabold leading-none mt-0.5 ${isToday ? 'text-fuchsia-600' : 'text-neutral-800 dark:text-neutral-100'}`}>
                    {d.getDate()}
                  </p>
                </div>

                {hasOutfit ? (
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800">
                      {thumbFor(outfitId)
                        ? <img src={thumbFor(outfitId)!} alt="" className="w-full h-full object-contain" />
                        : <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
                      }
                    </div>
                    <p className="text-sm font-semibold truncate text-neutral-700 dark:text-neutral-200 flex-1">
                      {nameFor(outfitId)}
                    </p>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setPicking(dateStr)}
                        className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs flex items-center justify-center hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40 transition-colors"
                        title="Change outfit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => remove(dateStr)}
                        className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-500 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setPicking(dateStr)}
                    className="flex-1 flex items-center gap-3 text-neutral-400 hover:text-fuchsia-500 transition-colors group"
                  >
                    <div className="w-11 h-11 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 group-hover:border-fuchsia-300 flex items-center justify-center text-lg transition-colors">
                      +
                    </div>
                    <span className="text-sm">Plan an outfit</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* month view */}
      {view === 'month' && (
        <div className="px-4">
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-neutral-400 py-1">
                {d[0]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />
              const dateStr = toDateStr(d)
              const outfitId = planner[dateStr]
              const hasOutfit = outfitId && savedMap.has(outfitId)
              const isToday = dateStr === today
              const thumb = hasOutfit ? thumbFor(outfitId) : null
              return (
                <button
                  key={dateStr}
                  onClick={() => setPicking(dateStr)}
                  className={`aspect-square rounded-xl relative overflow-hidden flex flex-col items-center justify-start pt-1 transition-all border-2 ${
                    isToday
                      ? 'border-fuchsia-400'
                      : hasOutfit
                        ? 'border-fuchsia-200 dark:border-fuchsia-800'
                        : 'border-transparent hover:border-fuchsia-200 dark:hover:border-fuchsia-800'
                  } ${hasOutfit ? 'bg-fuchsia-50 dark:bg-fuchsia-950/20' : 'bg-neutral-50 dark:bg-neutral-900'}`}
                >
                  <span className={`relative z-10 text-xs font-bold leading-none ${isToday ? 'text-fuchsia-600' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {d.getDate()}
                  </span>
                  {thumb && (
                    <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 mt-4" />
                  )}
                  {hasOutfit && !thumb && (
                    <span className="text-sm mt-0.5 relative z-10">👗</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {saved.length === 0 && (
        <p className="mt-10 text-center text-sm text-neutral-400 px-10">
          Save some outfits first, then plan your week here.
        </p>
      )}

      {/* outfit picker sheet */}
      <AnimatePresence>
        {picking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setPicking(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl p-5 pb-10 max-h-[72vh] flex flex-col"
            >
              <div className="w-10 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-base">Pick an outfit</p>
                {picking && planner[picking] && (
                  <button
                    onClick={() => { remove(picking); setPicking(null) }}
                    className="text-xs text-red-400 hover:text-red-500 transition-colors"
                  >
                    Remove from day
                  </button>
                )}
              </div>

              {saved.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-10">No saved outfits yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 overflow-y-auto">
                  {saved.map(outfit => {
                    const thumb = thumbFor(outfit.id)
                    const isSelected = picking ? planner[picking] === outfit.id : false
                    return (
                      <button
                        key={outfit.id}
                        onClick={() => assign(picking!, outfit.id)}
                        className={`aspect-[3/4] rounded-2xl overflow-hidden relative border-2 transition-all ${
                          isSelected ? 'border-fuchsia-500 ring-2 ring-fuchsia-200' : 'border-transparent'
                        }`}
                      >
                        {thumb
                          ? <img src={thumb} alt="" className="w-full h-full object-contain bg-neutral-50 dark:bg-neutral-800" />
                          : <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-3xl">👗</div>
                        }
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-white text-[10px] font-semibold truncate">{outfit.vibeName}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-fuchsia-500 flex items-center justify-center text-white text-[10px] font-bold">
                            ✓
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
