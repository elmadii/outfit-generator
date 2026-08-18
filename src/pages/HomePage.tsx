import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import { useSaved } from '../hooks/useSaved'
import { generateOutfits, outfitReadyCheck } from '../lib/outfitEngine'
import { storage } from '../lib/storage'
import { fetchWeather, weatherStyleHint } from '../lib/weather'
import type { GeneratedOutfit } from '../types'
import type { WeatherData } from '../lib/weather'

function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => storage.getTheme())
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    storage.setTheme(theme)
  }, [theme])
  return { theme, toggle: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')) }
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export default function HomePage() {
  const { items } = useCloset()
  const { saved } = useSaved()
  const { theme, toggle } = useTheme()
  const [ootd, setOotd] = useState<GeneratedOutfit | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState(false)

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const check = outfitReadyCheck(items)

  useEffect(() => {
    if (!check.ready) return
    const pairings = storage.getPairings()
    const outfits = generateOutfits(items, 1, pairings)
    if (outfits[0]) setOotd(outfits[0])
  }, [items])

  useEffect(() => {
    setWeatherLoading(true)
    fetchWeather()
      .then(data => { setWeather(data); setWeatherLoading(false) })
      .catch(() => { setWeatherError(true); setWeatherLoading(false) })
  }, [])

  const ootdItems = useMemo(() => {
    if (!ootd) return []
    return [ootd.picks.top, ootd.picks.layer, ootd.picks.bottom, ootd.picks.shoes]
      .filter(Boolean).map(id => itemMap.get(id!)).filter(Boolean) as typeof items
  }, [ootd, itemMap])

  const recentItems = useMemo(() =>
    [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [items])

  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-5 pt-12 pb-5">
        <div>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1">
            {getGreeting()}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-800 dark:text-stone-100">
            FitCheck
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            {items.length} piece{items.length !== 1 ? 's' : ''} · {saved.length} outfit{saved.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        <div className="flex items-start gap-2 mt-1">
          {/* weather widget */}
          {!weatherError && (
            <div className="bg-stone-800 dark:bg-stone-700 text-white rounded-2xl px-3 py-2.5 min-w-[76px] text-center shadow-md">
              {weatherLoading ? (
                <>
                  <p className="text-lg">🌡️</p>
                  <p className="text-[9px] opacity-50 mt-0.5">locating…</p>
                </>
              ) : weather ? (
                <>
                  <p className="text-xl leading-none">{weather.icon}</p>
                  <p className="text-base font-bold mt-0.5">{weather.temp}°C</p>
                  <p className="text-[9px] opacity-70 leading-tight mt-0.5">{weather.description}</p>
                </>
              ) : null}
            </div>
          )}
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-full bg-white dark:bg-stone-800 shadow-sm flex items-center justify-center text-base border border-stone-100 dark:border-stone-700"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* weather hint */}
      {weather && (
        <div className="mx-5 mb-5 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">{weather.temp < 12 ? '🧥' : weather.temp > 24 ? '👙' : '✨'}</span>
          <p className="text-xs text-stone-500 dark:text-stone-400 flex-1">{weatherStyleHint(weather)}</p>
          <Link to="/generate" className="text-xs font-bold text-fuchsia-500 whitespace-nowrap">Get fit →</Link>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="px-5 grid grid-cols-3 gap-2.5 mb-6">
        <Link
          to="/upload"
          className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <span className="text-2xl">📸</span>
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Add piece</span>
        </Link>
        <Link
          to="/arcade"
          className="bg-fuchsia-500 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 shadow-md active:scale-95 transition-transform"
        >
          <span className="text-2xl">🎮</span>
          <span className="text-xs font-bold text-white">Build look</span>
        </Link>
        <Link
          to="/generate"
          className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <span className="text-2xl">✨</span>
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">AI Picks</span>
        </Link>
      </div>

      {/* ── Outfit of the day ── */}
      {ootd && ootdItems.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mb-5 bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden"
        >
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs">🌅</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Outfit of the Day</p>
            </div>
            <Link to="/generate" className="text-xs font-semibold text-fuchsia-500">
              Refresh →
            </Link>
          </div>
          <div className={`grid gap-1 px-3 pb-3 ${ootdItems.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {ootdItems.map(item => (
              <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="text-xs text-stone-400 truncate flex-1 mr-4">
              {ootd.vibeName} · {ootdItems.map(i => i.name).join(' + ')}
            </p>
            <Link
              to="/saved"
              className="text-xs font-bold text-fuchsia-500 shrink-0"
            >
              Save →
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Recent pieces ── */}
      {recentItems.length > 0 && (
        <div className="mb-5">
          <div className="px-5 flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recent Pieces</p>
            <Link to="/closet" className="text-xs font-semibold text-fuchsia-500">See all →</Link>
          </div>
          <div className="pl-5 flex gap-2.5 overflow-x-auto no-scrollbar pr-5">
            {recentItems.map(item => (
              <Link key={item.id} to="/closet" className="shrink-0 w-20 active:scale-95 transition-transform">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 mb-1">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] text-stone-400 text-center truncate">{item.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Saved outfits ── */}
      {saved.length > 0 && (
        <div className="mb-5">
          <div className="px-5 flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Saved Outfits</p>
            <Link to="/saved" className="text-xs font-semibold text-fuchsia-500">See all →</Link>
          </div>
          <div className="pl-5 flex gap-3 overflow-x-auto no-scrollbar pr-5">
            {saved.slice(0, 6).map(outfit => {
              const outfitIds = [outfit.picks.top, outfit.picks.layer, outfit.picks.bottom, outfit.picks.shoes].filter(Boolean)
              const previewItems = outfitIds.slice(0, 4).map(id => itemMap.get(id!)).filter(Boolean)
              return (
                <Link
                  key={outfit.id}
                  to="/saved"
                  className="shrink-0 active:scale-95 transition-transform"
                >
                  <div className="w-24 h-24 rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5 bg-stone-100 dark:bg-stone-800 mb-1">
                    {previewItems.map(item => (
                      <div key={item!.id} className="overflow-hidden bg-stone-100 dark:bg-stone-800">
                        <img src={item!.image} alt={item!.name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {previewItems.length < 4 && Array.from({ length: 4 - previewItems.length }).map((_, i) => (
                      <div key={i} className="bg-stone-100 dark:bg-stone-800" />
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-400 text-center w-24 truncate">{outfit.vibeName}</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-5 mt-2 border-2 border-dashed border-fuchsia-200 dark:border-fuchsia-900 rounded-3xl p-8 text-center"
        >
          <p className="text-5xl mb-3">✨</p>
          <p className="text-base font-bold mb-1 text-stone-800 dark:text-stone-100">Build your digital wardrobe</p>
          <p className="text-sm text-stone-400 mb-5 max-w-xs mx-auto">
            Add your clothes and let FitCheck create AI-powered outfits for you.
          </p>
          <Link
            to="/upload"
            className="inline-block px-6 py-2.5 rounded-full bg-fuchsia-500 text-white text-sm font-bold shadow-md active:scale-95 transition-transform"
          >
            Add my first piece
          </Link>
        </motion.div>
      )}

      <p className="text-center text-[10px] text-stone-200 dark:text-stone-700 mt-6 mb-2">
        🔒 Everything stored locally on your device
      </p>
    </div>
  )
}
