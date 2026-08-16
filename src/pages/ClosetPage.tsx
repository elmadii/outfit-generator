import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import ItemCard from '../components/ItemCard'
import type { Category } from '../types'
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_EMOJI } from '../types'

type SortBy = 'newest' | 'name' | 'category'

export default function ClosetPage() {
  const { items, deleteItem } = useCloset()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = [...items]
    if (filterCat !== 'all') list = list.filter(i => i.category === filterCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.colors.some(c => c.toLowerCase().includes(q)) ||
        i.vibes.some(v => v.includes(q)) ||
        i.category.includes(q)
      )
    }
    if (sortBy === 'newest') list.sort((a, b) => b.createdAt - a.createdAt)
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else list.sort((a, b) => a.category.localeCompare(b.category))
    return list
  }, [items, filterCat, search, sortBy])

  const byCategory = useMemo(() => {
    if (filterCat !== 'all' || search || sortBy !== 'category') return null
    return CATEGORIES.map(cat => ({
      cat,
      items: items.filter(i => i.category === cat).sort((a, b) => b.createdAt - a.createdAt),
    })).filter(g => g.items.length > 0)
  }, [items, filterCat, search, sortBy])

  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto">
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">👗 My Closet</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{items.length} items</p>
        </div>
        <Link
          to="/upload"
          className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-xs font-bold shadow"
        >
          + Add
        </Link>
      </div>

      {/* search */}
      <div className="px-5 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by name, color, vibe…"
          className="w-full rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm focus:outline-none focus:border-fuchsia-400 transition-colors"
        />
      </div>

      {/* filters */}
      <div className="flex gap-2 px-5 mb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterCat('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${filterCat === 'all' ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'}`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${filterCat === cat ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'}`}
          >
            {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* sort */}
      <div className="flex gap-2 px-5 mb-4">
        {(['newest', 'name', 'category'] as SortBy[]).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${sortBy === s ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* items */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center gap-3">
          <span className="text-6xl">🌟</span>
          <p className="font-semibold">Your closet is empty</p>
          <p className="text-sm text-neutral-400">Upload your first item to get started!</p>
          <Link to="/upload" className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-bold shadow">
            Upload now
          </Link>
        </div>
      ) : byCategory ? (
        <div className="px-5 flex flex-col gap-8">
          {byCategory.map(({ cat, items: catItems }) => (
            <div key={cat}>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">
                {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]} · {catItems.length}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {catItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onDelete={() => setDeleteId(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 grid grid-cols-3 gap-2">
          <AnimatePresence>
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={() => setDeleteId(item.id)}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-3 py-10 text-center text-neutral-400 text-sm">No items match your search 🙈</div>
          )}
        </div>
      )}

      {/* delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl p-6 pb-10"
            >
              <p className="text-base font-bold mb-1">Remove this item?</p>
              <p className="text-sm text-neutral-400 mb-5">This can't be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-sm font-semibold">
                  Cancel
                </button>
                <button
                  onClick={() => { deleteItem(deleteId); setDeleteId(null) }}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold"
                >
                  🗑 Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
