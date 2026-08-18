import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCloset } from '../hooks/useCloset'
import ItemCard from '../components/ItemCard'
import type { Category, ClosetItem } from '../types'
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_EMOJI, VIBE_EMOJI } from '../types'
import { colorHex } from '../lib/colorTheory'

type SortBy = 'newest' | 'name' | 'category'

export default function ClosetPage() {
  const { items, deleteItem } = useCloset()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ClosetItem | null>(null)

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

      {/* header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-800 dark:text-stone-100">
            My Wardrobe
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">{items.length} items</p>
        </div>
        <Link
          to="/upload"
          className="px-4 py-2.5 rounded-2xl bg-fuchsia-500 text-white text-xs font-bold shadow-md active:scale-95 transition-transform"
        >
          + Add piece
        </Link>
      </div>

      {/* search */}
      <div className="px-5 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, color, vibe…"
          className="w-full rounded-2xl border-2 border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm focus:outline-none focus:border-fuchsia-400 transition-colors"
        />
      </div>

      {/* category filters */}
      <div className="flex gap-2 px-5 mb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterCat('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${filterCat === 'all' ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${filterCat === cat ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}
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
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all capitalize ${sortBy === s ? 'bg-stone-800 dark:bg-white text-white dark:text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* items */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center gap-3">
          <span className="text-6xl">👗</span>
          <p className="font-semibold text-stone-800 dark:text-stone-100">Your wardrobe is empty</p>
          <p className="text-sm text-stone-400">Upload your first piece to get started!</p>
          <Link
            to="/upload"
            className="mt-2 px-6 py-2.5 rounded-full bg-fuchsia-500 text-white text-sm font-bold shadow-md"
          >
            Upload now
          </Link>
        </div>
      ) : byCategory ? (
        <div className="px-5 flex flex-col gap-8">
          {byCategory.map(({ cat, items: catItems }) => (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
                {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]} · {catItems.length}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {catItems.map(item => (
                    <ItemCard key={item.id} item={item} onClick={() => setDetail(item)} onDelete={() => setDeleteId(item.id)} />
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
              <ItemCard key={item.id} item={item} onClick={() => setDetail(item)} onDelete={() => setDeleteId(item.id)} />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-3 py-10 text-center text-stone-400 text-sm">
              No items match your search
            </div>
          )}
        </div>
      )}

      {/* item detail sheet */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl p-5 pb-10 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-stone-200 dark:bg-stone-700 rounded-full mx-auto mb-4" />

              <div className="flex gap-4 items-start mb-4">
                <div
                  className="w-28 h-36 rounded-2xl overflow-hidden shrink-0 shadow-sm"
                  style={{ background: 'repeating-conic-gradient(#f3f4f6 0% 25%, #fafafa 0% 50%) 0 0 / 12px 12px' }}
                >
                  <img src={detail.image} alt={detail.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="font-extrabold text-base text-stone-800 dark:text-stone-100 leading-tight">{detail.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5 mb-3">
                    {CATEGORY_EMOJI[detail.category]} {CATEGORY_LABEL[detail.category]}
                  </p>

                  {detail.colors.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {detail.colors.map(c => (
                        <span key={c} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: colorHex(c) }} title={c} />
                      ))}
                    </div>
                  )}

                  {detail.vibes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {detail.vibes.map(v => (
                        <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300">
                          {VIBE_EMOJI[v]} {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {detail.customVibes && detail.customVibes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {detail.customVibes.map(v => (
                        <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI description */}
              {detail.aiDescription && (
                <div className="rounded-2xl border border-violet-100 dark:border-violet-900 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3 mb-4">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">✨ AI Description</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{detail.aiDescription}</p>
                </div>
              )}

              {/* notes */}
              {detail.notes && (
                <p className="text-xs text-stone-400 mb-4 px-1">📝 {detail.notes}</p>
              )}

              <button
                onClick={() => { setDeleteId(detail.id); setDetail(null) }}
                className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-bold"
              >
                🗑 Remove from wardrobe
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl p-6 pb-10"
            >
              <p className="text-base font-bold mb-1 text-stone-800 dark:text-stone-100">Remove this item?</p>
              <p className="text-sm text-stone-400 mb-5">This can't be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { deleteItem(deleteId); setDeleteId(null) }}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
