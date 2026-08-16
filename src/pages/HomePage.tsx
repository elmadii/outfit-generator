import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import { useSaved } from '../hooks/useSaved'
import { generateOutfits, outfitReadyCheck } from '../lib/outfitEngine'
import { storage } from '../lib/storage'
import type { GeneratedOutfit } from '../types'

function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => storage.getTheme())
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    storage.setTheme(theme)
  }, [theme])
  return { theme, toggle: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')) }
}

export default function HomePage() {
  const { items } = useCloset()
  const { saved } = useSaved()
  const { theme, toggle } = useTheme()
  const [ootd, setOotd] = useState<GeneratedOutfit | null>(null)

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const check = outfitReadyCheck(items)

  useEffect(() => {
    if (!check.ready) return
    const pairings = storage.getPairings()
    const outfits = generateOutfits(items, 1, pairings)
    if (outfits[0]) setOotd(outfits[0])
  }, [items])

  const ootdItems = useMemo(() => {
    if (!ootd) return []
    return [ootd.picks.top, ootd.picks.bottom, ootd.picks.shoes]
      .filter(Boolean).map((id) => itemMap.get(id!)).filter(Boolean) as typeof items
  }, [ootd, itemMap])

  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto">
      {/* header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-600 to-rose-500 bg-clip-text text-transparent">
            FitCheck ✨
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Your closet, your rules</p>
        </div>
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-md flex items-center justify-center text-lg border border-neutral-100 dark:border-neutral-700"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* stats */}
      <div className="flex gap-3 px-5 mb-6 overflow-x-auto no-scrollbar">
        {[
          { val: items.length, label: 'Items', emoji: '👗' },
          { val: saved.length, label: 'Saved fits', emoji: '❤️' },
          { val: items.filter(i => i.category === 'tops').length, label: 'Tops', emoji: '👕' },
          { val: items.filter(i => i.category === 'shoes').length, label: 'Shoes', emoji: '👟' },
        ].map((s) => (
          <div key={s.label} className="shrink-0 bg-white dark:bg-neutral-900 rounded-2xl px-4 py-3 shadow-sm border border-neutral-100 dark:border-neutral-800 text-center min-w-[70px]">
            <div className="text-lg">{s.emoji}</div>
            <div className="text-xl font-bold tracking-tight">{s.val}</div>
            <div className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* OOTD */}
      {ootd && ootdItems.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-5 mb-6 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <span className="text-sm">🌅</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Outfit of the Day</p>
          </div>
          <div className="grid grid-cols-3 gap-1 px-3 pb-3">
            {ootdItems.map((item) => (
              <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="px-4 pb-4 flex justify-between items-center">
            <p className="text-xs text-neutral-500">{ootdItems.map(i => i.name).join(' + ')}</p>
          </div>
        </motion.div>
      )}

      {/* action grid */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-4">
        {[
          { to: '/upload', emoji: '📸', label: 'Upload', sub: 'Add to your closet', color: 'from-violet-500 to-fuchsia-500' },
          { to: '/closet', emoji: '👗', label: 'Closet', sub: `${items.length} items`, color: 'from-fuchsia-500 to-rose-500' },
          { to: '/generate', emoji: '✨', label: 'Generate', sub: check.ready ? 'Ready to generate!' : 'Add more items', color: 'from-rose-500 to-orange-400' },
          { to: '/arcade', emoji: '🎮', label: 'Arcade', sub: 'Mix & match', color: 'from-orange-400 to-yellow-400' },
        ].map(({ to, emoji, label, sub, color }) => (
          <Link
            key={to}
            to={to}
            className={`bg-gradient-to-br ${color} rounded-3xl p-5 flex flex-col gap-1 shadow-md active:scale-95 transition-transform`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-white font-bold text-base">{label}</span>
            <span className="text-white/70 text-[11px]">{sub}</span>
          </Link>
        ))}
      </div>

      {/* empty CTA */}
      {items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-5 mt-2 border-2 border-dashed border-fuchsia-200 dark:border-fuchsia-900 rounded-3xl p-6 text-center"
        >
          <p className="text-3xl mb-2">👆</p>
          <p className="text-sm font-semibold mb-1">Start with one item</p>
          <p className="text-xs text-neutral-400 mb-4">Photo of a hoodie, jeans, sneakers — anything. One per photo works best.</p>
          <Link
            to="/upload"
            className="inline-block px-6 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-semibold shadow-md"
          >
            Upload my first item
          </Link>
        </motion.div>
      )}

      <p className="text-center text-[10px] text-neutral-300 dark:text-neutral-700 mt-6 mb-2">
        🔒 Stored locally on your device
      </p>
    </div>
  )
}
