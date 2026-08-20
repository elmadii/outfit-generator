import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import { useSaved } from '../hooks/useSaved'
import { generateOutfits, outfitReadyCheck } from '../lib/outfitEngine'
import { storage } from '../lib/storage'
import { fetchWeather, weatherStyleHint } from '../lib/weather'
import type { WeatherData } from '../lib/weather'
import type { GeneratedOutfit, ClosetItem, VibeTag } from '../types'
import { CATEGORY_LABEL, CATEGORY_EMOJI, VIBE_EMOJI } from '../types'
import { colorHex, paletteLabel } from '../lib/colorTheory'
import OutfitCollage from '../components/OutfitCollage'

/* ── Why breakdown ── */
function WhyBreakdown({ outfit, itemMap }: { outfit: GeneratedOutfit; itemMap: Map<string, ClosetItem> }) {
  const pieces = [outfit.picks.top, outfit.picks.layer, outfit.picks.bottom, outfit.picks.shoes, outfit.picks.bag, outfit.picks.accessory]
    .filter(Boolean).map(id => itemMap.get(id!)).filter(Boolean) as ClosetItem[]

  const allColors = [...new Set(pieces.flatMap(p => p.colors))]
  const palette = paletteLabel(pieces.map(p => p.colors))

  const vibeCount = (() => {
    const m = new Map<VibeTag, number>()
    for (const p of pieces) for (const v of p.vibes) m.set(v, (m.get(v) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  })()

  const catLabels = pieces.map(p => CATEGORY_LABEL[p.category])

  return (
    <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
      {allColors.length > 0 && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] shrink-0">🎨</span>
          <div className="flex gap-1 shrink-0">
            {allColors.slice(0, 5).map(c => (
              <span key={c} className="w-3 h-3 rounded-full border border-white/80 shadow-sm" style={{ background: colorHex(c) }} />
            ))}
          </div>
          <span className="text-[10px] text-stone-400 truncate">
            {allColors.slice(0, 3).join(' · ')}{palette ? ` — ${palette.toLowerCase()}` : ''}
          </span>
        </div>
      )}
      {vibeCount.length > 0 && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] shrink-0">✨</span>
          <span className="text-[10px] text-stone-400 truncate">
            {vibeCount.map(([v, n]) => `${VIBE_EMOJI[v] ?? ''} ${v} ×${n}`).join('  ')}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] shrink-0">👗</span>
        <span className="text-[10px] text-stone-400 truncate">{catLabels.join(' · ')}</span>
      </div>
    </div>
  )
}

/* ── Occasion config ── */
interface OccasionTag {
  key: string
  label: string
  emoji: string
  vibes: VibeTag[]
}
const OCCASIONS: OccasionTag[] = [
  { key: 'class',   label: 'Class',    emoji: '📚', vibes: ['casual', 'preppy', 'minimalist'] },
  { key: 'date',    label: 'Date',     emoji: '🌹', vibes: ['romantic', 'luxury', 'minimalist'] },
  { key: 'night',   label: 'Night out',emoji: '🌙', vibes: ['edgy', 'luxury', 'y2k', 'streetwear'] },
  { key: 'friends', label: 'Friends',  emoji: '👥', vibes: ['casual', 'streetwear', 'boho', 'y2k'] },
  { key: 'work',    label: 'Work',     emoji: '💼', vibes: ['preppy', 'minimalist', 'luxury'] },
  { key: 'chill',   label: 'Chill',   emoji: '🛋️', vibes: ['casual', 'boho'] },
  { key: 'gym',     label: 'Gym',      emoji: '🏋️', vibes: ['sporty'] },
  { key: 'travel',  label: 'Travel',   emoji: '✈️', vibes: ['casual', 'minimalist'] },
]

/* ── Score outfit for an occasion ── */
function occasionFit(
  outfit: GeneratedOutfit,
  preferred: VibeTag[],
  itemMap: Map<string, ClosetItem>,
): number {
  if (preferred.length === 0) return Math.round(Math.min(outfit.score, 100))
  const ids = Object.values(outfit.picks).filter(Boolean) as string[]
  const outfitItems = ids.map(id => itemMap.get(id)).filter(Boolean) as ClosetItem[]
  let matches = 0
  for (const item of outfitItems) {
    if (item.vibes.some(v => preferred.includes(v as VibeTag))) matches++
  }
  const itemFit = outfitItems.length > 0 ? matches / outfitItems.length : 0
  const vibeFit = outfit.dominantVibe && preferred.includes(outfit.dominantVibe) ? 1 : 0
  const normalizedScore = Math.min(outfit.score, 100) / 100
  return Math.round((itemFit * 0.5 + vibeFit * 0.3 + normalizedScore * 0.2) * 100)
}

type Feedback = 'loved' | 'ok' | 'skip'

export default function GeneratePage() {
  const { items } = useCloset()
  const { saveOutfit, unsaveOutfit, isSaved } = useSaved()
  const [occasion, setOccasion] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [useWeather, setUseWeather] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([])
  const [generating, setGenerating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({})
  const [preSave, setPreSave] = useState<GeneratedOutfit | null>(null)

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const check = outfitReadyCheck(items)
  const seenKeys = useRef(new Set<string>())

  /* preferred vibes from selected tag or typed text */
  const preferredVibes = useMemo((): VibeTag[] => {
    if (selectedTag) {
      return OCCASIONS.find(o => o.key === selectedTag)?.vibes ?? []
    }
    const q = occasion.toLowerCase()
    if (!q) return []
    return OCCASIONS.find(o =>
      o.label.toLowerCase().includes(q) || o.key.includes(q)
    )?.vibes ?? []
  }, [selectedTag, occasion])

  /* fetch weather when checkbox is toggled */
  useEffect(() => {
    if (!useWeather || weather) return
    setWeatherLoading(true)
    fetchWeather()
      .then(w => { setWeather(w); setWeatherLoading(false) })
      .catch(() => setWeatherLoading(false))
  }, [useWeather])

  const generate = useCallback(() => {
    setGenerating(true)
    setTimeout(() => {
      const pairings = storage.getPairings()
      // reset dedup history when wardrobe is small to avoid running dry
      if (seenKeys.current.size > 40) seenKeys.current.clear()

      const allResults = generateOutfits(items, 30, pairings)
      let results = allResults.filter(o => {
        const key = [o.picks.top, o.picks.bottom, o.picks.shoes, o.picks.layer ?? ''].join(':')
        if (seenKeys.current.has(key)) return false
        seenKeys.current.add(key)
        return true
      })
      // fallback: if dedup filtered everything, use first 6 anyway
      if (results.length === 0) results = allResults

      /* weather filter */
      if (useWeather && weather) {
        if (weather.temp < 12) {
          // prefer outfits with a layer
          results.sort((a, b) =>
            (b.picks.layer ? 1 : 0) - (a.picks.layer ? 1 : 0)
          )
        } else if (weather.temp > 24) {
          // prefer outfits without heavy layer
          results.sort((a, b) =>
            (a.picks.layer ? 1 : 0) - (b.picks.layer ? 1 : 0)
          )
        }
      }

      /* occasion sort */
      if (preferredVibes.length > 0) {
        results = results.sort((a, b) =>
          occasionFit(b, preferredVibes, itemMap) - occasionFit(a, preferredVibes, itemMap)
        )
      }

      setOutfits(results.slice(0, 6))
      setFeedback({})
      setExpandedId(null)
      setGenerating(false)
    }, 700)
  }, [items, preferredVibes, useWeather, weather, itemMap])

  /* outfit items for display */
  function getOutfitItems(outfit: GeneratedOutfit) {
    return (
      [
        { id: outfit.picks.top,       cat: 'tops' },
        { id: outfit.picks.layer,     cat: 'layer' },
        { id: outfit.picks.bottom,    cat: 'bottoms' },
        { id: outfit.picks.shoes,     cat: 'shoes' },
        { id: outfit.picks.bag,       cat: 'bags' },
        { id: outfit.picks.accessory, cat: 'accessories' },
      ] as { id?: string; cat: string }[]
    ).filter(e => e.id).map(e => ({ item: itemMap.get(e.id!)!, cat: e.cat })).filter(e => e.item)
  }

  if (!check.ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center gap-4 max-w-lg mx-auto">
        <span className="text-6xl">🔒</span>
        <h2 className="text-xl font-bold">Not quite ready</h2>
        <p className="text-sm text-stone-400">{check.message}</p>
        <div className="flex gap-4 text-sm mt-2">
          {(['tops', 'bottoms', 'shoes'] as const).map(cat => (
            <div key={cat} className={`text-center ${(check[cat] ?? 0) >= 1 ? 'text-green-500' : 'text-stone-400'}`}>
              <div className="text-2xl">{(check[cat] ?? 0) >= 1 ? '✅' : '❌'}</div>
              <div className="text-xs mt-1 capitalize">{cat}</div>
            </div>
          ))}
        </div>
        <Link to="/upload" className="mt-4 px-6 py-3 rounded-full bg-fuchsia-500 text-white text-sm font-bold shadow-md">
          Add items
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-800 dark:text-stone-100">
          ✨ AI Suggestions
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Tell me the occasion — I'll find your best fits
        </p>
      </div>

      {/* ── Occasion card ── */}
      <div className="mx-5 mb-4 bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 p-5">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 block">
          What's the occasion?
        </label>
        <input
          type="text"
          value={occasion}
          onChange={e => { setOccasion(e.target.value); setSelectedTag(null) }}
          placeholder="e.g. casual brunch, job interview…"
          className="w-full rounded-2xl border-2 border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 py-2.5 text-sm focus:outline-none focus:border-fuchsia-400 transition-colors mb-3"
        />

        {/* quick tags */}
        <div className="flex gap-2 flex-wrap">
          {OCCASIONS.map(o => (
            <button
              key={o.key}
              onClick={() => {
                setSelectedTag(prev => prev === o.key ? null : o.key)
                setOccasion('')
              }}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all',
                selectedTag === o.key
                  ? 'bg-fuchsia-500 border-fuchsia-500 text-white'
                  : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:border-fuchsia-300',
              ].join(' ')}
            >
              {o.emoji} {o.label}
            </button>
          ))}
        </div>

        {/* weather toggle */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setUseWeather(v => !v)}
            className={[
              'w-11 h-6 rounded-full relative transition-colors',
              useWeather ? 'bg-fuchsia-500' : 'bg-stone-200 dark:bg-stone-700',
            ].join(' ')}
          >
            <span className={[
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all',
              useWeather ? 'left-5' : 'left-0.5',
            ].join(' ')} />
          </button>
          <div>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
              {useWeather ? '🌡️ Match today\'s weather' : '☁️ Include weather'}
            </p>
            {useWeather && (
              <p className="text-[11px] text-stone-400 mt-0.5">
                {weatherLoading
                  ? 'Locating…'
                  : weather
                    ? `${weather.temp}°C · ${weather.description} — ${weatherStyleHint(weather)}`
                    : 'Could not fetch weather — check location permissions'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Generate button ── */}
      <div className="px-5 mb-5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={generate}
          disabled={generating}
          className="w-full py-4 rounded-2xl bg-fuchsia-500 text-white font-bold text-sm shadow-md disabled:opacity-60 active:bg-fuchsia-600 transition-colors"
        >
          {generating ? '✨ Finding your best looks…' : outfits.length ? '🔁 Regenerate' : '✨ Generate Suggestions'}
        </motion.button>
      </div>

      {/* ── Loading ── */}
      {generating && (
        <div className="flex flex-col items-center gap-3 py-16">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="text-4xl"
          >
            ✨
          </motion.span>
          <p className="text-sm text-stone-400">
            {selectedTag
              ? `Building ${OCCASIONS.find(o => o.key === selectedTag)?.label.toLowerCase()} looks…`
              : 'Matching your wardrobe…'}
          </p>
        </div>
      )}

      {/* ── Empty hero ── */}
      {outfits.length === 0 && !generating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-700 p-10 text-center flex flex-col items-center gap-3"
        >
          <span className="text-5xl">🪄</span>
          <p className="font-bold text-lg text-stone-700 dark:text-stone-200">Ready to find your fit</p>
          <p className="text-sm text-stone-400">
            Pick an occasion above and tap Generate — I'll pull the best combos from your {items.length} items.
          </p>
        </motion.div>
      )}

      {/* ── Outfit cards ── */}
      <AnimatePresence>
        {outfits.length > 0 && !generating && (
          <div className="px-5 flex flex-col gap-4">
            {outfits.map((outfit, idx) => {
              const outfitItems = getOutfitItems(outfit)
              const fit = occasionFit(outfit, preferredVibes, itemMap)
              const expanded = expandedId === outfit.id
              const fb = feedback[outfit.id]
              const saved = isSaved(outfit.id)

              return (
                <motion.div
                  key={outfit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden"
                >
                  {/* card header */}
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-stone-800 dark:text-stone-100">{outfit.vibeName}</p>
                      {preferredVibes.length > 0 && (
                        <p className="text-xs text-stone-400 mt-0.5">
                          {fit >= 75 ? '🎯' : fit >= 50 ? '👍' : '💡'} {fit}% occasion fit
                        </p>
                      )}
                    </div>
                    {fb && (
                      <span className="text-xl">
                        {fb === 'loved' ? '💗' : fb === 'ok' ? '😐' : '❌'}
                      </span>
                    )}
                  </div>

                  {/* superimposed flat-lay collage */}
                  <OutfitCollage items={outfitItems} />

                  {/* item names */}
                  <div className="px-4 py-3 flex flex-wrap gap-1.5">
                    {outfitItems.map(({ item }) => (
                      <span
                        key={item.id}
                        className="text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2.5 py-1 rounded-full"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>

                  {/* Why? expandable */}
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => setExpandedId(expanded ? null : outfit.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-fuchsia-500"
                    >
                      <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
                      Why this outfit?
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

                  {/* feedback */}
                  <div className="px-4 py-2 flex gap-2 border-t border-stone-100 dark:border-stone-800">
                    {([ ['loved', '💗 Loved'], ['ok', '😐 OK'], ['skip', '❌ Skip'] ] as [Feedback, string][]).map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => setFeedback(f => ({ ...f, [outfit.id]: v }))}
                        className={[
                          'flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all',
                          fb === v
                            ? v === 'loved' ? 'bg-pink-100 text-pink-600'
                              : v === 'ok' ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-red-100 text-red-500'
                            : 'text-stone-400 hover:text-stone-600',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* save + plan */}
                  <div className="px-4 pb-4 pt-2 flex gap-2">
                    <button
                      onClick={() => setPreSave(outfit)}
                      className={[
                        'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm',
                        saved
                          ? 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                          : 'bg-fuchsia-500 text-white',
                      ].join(' ')}
                    >
                      {saved ? '✓ Saved' : '❤️ Save outfit'}
                    </button>
                    <Link
                      to="/planner"
                      className="px-4 py-2.5 rounded-xl border-2 border-stone-200 dark:border-stone-700 text-sm font-semibold text-stone-500 hover:border-fuchsia-300 transition-all"
                    >
                      📅
                    </Link>
                  </div>
                </motion.div>
              )
            })}

            <p className="text-center text-xs text-stone-400 py-2">
              {outfits.length} suggestions · tap ❤️ to save
            </p>
          </div>
        )}
      </AnimatePresence>

      {/* ── Pre-save confirmation modal ── */}
      <AnimatePresence>
        {preSave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setPreSave(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl px-6 py-6 pb-12"
            >
              <div className="w-10 h-1 bg-stone-200 dark:bg-stone-700 rounded-full mx-auto mb-5" />

              {(() => {
                const fit = occasionFit(preSave, preferredVibes, itemMap)
                const isGood = fit >= 65 || preferredVibes.length === 0
                return (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-4xl">{isGood ? '✅' : '⚠️'}</span>
                      <div>
                        <p className="font-bold text-stone-800 dark:text-stone-100">
                          {isGood ? 'Great choice!' : 'Heads up'}
                        </p>
                        <p className="text-sm text-stone-400 mt-0.5">
                          {isGood
                            ? `This outfit fits your ${selectedTag ? OCCASIONS.find(o => o.key === selectedTag)?.label : 'chosen'} vibe perfectly.`
                            : 'This outfit may not fully match the occasion. Still a great look though!'}
                        </p>
                      </div>
                    </div>

                    {preferredVibes.length > 0 && (
                      <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl px-4 py-3 mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-stone-500">Occasion fit</p>
                          <p className="text-xs font-bold text-fuchsia-500">{fit}%</p>
                        </div>
                        <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${fit}%`,
                              background: fit >= 75 ? '#a855f7' : fit >= 50 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-stone-400 mb-5">{preSave.reason}</p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setPreSave(null)}
                        className="flex-1 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 text-sm font-semibold text-stone-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          isSaved(preSave.id) ? unsaveOutfit(preSave.id) : saveOutfit(preSave)
                          setPreSave(null)
                        }}
                        className="flex-1 py-3 rounded-2xl bg-fuchsia-500 text-white text-sm font-bold shadow-md"
                      >
                        {isSaved(preSave.id) ? '💔 Remove' : '❤️ Save it!'}
                      </button>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
