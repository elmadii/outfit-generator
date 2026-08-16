import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSaved } from '../hooks/useSaved'
import { useCloset } from '../hooks/useCloset'
import OutfitCard from '../components/OutfitCard'
import type { SavedOutfit } from '../types'

export default function SavedPage() {
  const { saved, collections, saveOutfit, unsaveOutfit, isSaved, addCollection, deleteCollection } = useSaved()
  const { items } = useCloset()
  const [filterCol, setFilterCol] = useState<string>('all')
  const [showAddCol, setShowAddCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [detail, setDetail] = useState<SavedOutfit | null>(null)
  const [moveOutfit, setMoveOutfit] = useState<SavedOutfit | null>(null)

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  const filtered = useMemo(() => {
    if (filterCol === 'all') return saved
    if (filterCol === 'uncategorized') return saved.filter(s => !s.collectionId)
    return saved.filter(s => s.collectionId === filterCol)
  }, [saved, filterCol])

  const addCol = () => {
    if (!newColName.trim()) return
    addCollection(newColName.trim())
    setNewColName('')
    setShowAddCol(false)
  }

  const moveToCollection = (outfit: SavedOutfit, collectionId: string | undefined) => {
    unsaveOutfit(outfit.id)
    saveOutfit({ ...outfit }, collectionId)
    setMoveOutfit(null)
  }

  return (
    <div className="min-h-screen flex flex-col pb-28 max-w-lg mx-auto">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">❤️ Saved</h1>
        <p className="text-xs text-neutral-400 mt-0.5">{saved.length} saved outfits</p>
      </div>

      {/* collections */}
      <div className="flex gap-2 px-5 mb-4 overflow-x-auto no-scrollbar">
        {(['all', 'uncategorized', ...collections.map(c => c.id)] as string[]).map(id => {
          const col = collections.find(c => c.id === id)
          const label = id === 'all' ? 'All' : id === 'uncategorized' ? 'Uncategorized' : col?.name ?? id
          return (
            <button
              key={id}
              onClick={() => setFilterCol(id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${filterCol === id ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-fuchsia-300'}`}
            >
              {label}
              {col && (
                <button
                  onClick={e => { e.stopPropagation(); deleteCollection(id) }}
                  className="ml-1 opacity-50 hover:opacity-100 text-[10px]"
                >
                  ×
                </button>
              )}
            </button>
          )
        })}
        <button
          onClick={() => setShowAddCol(true)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:border-fuchsia-300 transition-colors"
        >
          + Collection
        </button>
      </div>

      {/* add collection modal */}
      <AnimatePresence>
        {showAddCol && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setShowAddCol(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl p-6 pb-10"
            >
              <p className="font-bold mb-3">New collection</p>
              <input
                autoFocus
                type="text"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCol()}
                placeholder="Weekend vibes, Going out, Work…"
                className="w-full rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-400 mb-3"
              />
              <button onClick={addCol} disabled={!newColName.trim()} className="w-full py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white font-bold disabled:opacity-40">
                Create
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* grid */}
      {saved.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center gap-3">
          <span className="text-6xl">🤍</span>
          <p className="font-semibold">No saved fits yet</p>
          <p className="text-sm text-neutral-400">Tap ❤️ on any outfit to save it here.</p>
        </div>
      ) : (
        <div className="px-5 grid grid-cols-2 gap-3">
          <AnimatePresence>
            {filtered.map(outfit => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                itemMap={itemMap}
                isSaved={isSaved(outfit.id)}
                onSave={() => saveOutfit(outfit)}
                onUnsave={() => unsaveOutfit(outfit.id)}
                onClick={() => setDetail(outfit)}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-2 py-10 text-center text-neutral-400 text-sm">
              No outfits in this collection
            </div>
          )}
        </div>
      )}

      {/* detail modal */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl p-6 pb-12 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mx-auto mb-5" />
              <h3 className="font-extrabold text-xl mb-1">{detail.vibeName}</h3>
              <p className="text-xs text-neutral-400 mb-4">
                Saved {new Date(detail.savedAt).toLocaleDateString()}
                {detail.collectionId && ` · ${collections.find(c => c.id === detail.collectionId)?.name}`}
              </p>

              <div className="grid grid-cols-3 gap-1 mb-4 rounded-2xl overflow-hidden">
                {[detail.picks.top, detail.picks.bottom, detail.picks.shoes, detail.picks.bag, detail.picks.accessory]
                  .filter(Boolean).map(id => {
                    const item = itemMap.get(id!)
                    if (!item) return null
                    return (
                      <div key={id} className="aspect-square bg-neutral-100 dark:bg-neutral-800">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )
                  })}
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { unsaveOutfit(detail.id); setDetail(null) }}
                  className="flex-1 py-3 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-bold"
                >
                  💔 Remove
                </button>
                <button
                  onClick={() => { setMoveOutfit(detail); setDetail(null) }}
                  className="flex-1 py-3 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-sm font-semibold"
                >
                  📁 Move
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* move to collection modal */}
      <AnimatePresence>
        {moveOutfit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setMoveOutfit(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl p-6 pb-10"
            >
              <p className="font-bold mb-3">Move to collection</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => moveToCollection(moveOutfit, undefined)}
                  className="py-3 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-sm text-left px-4"
                >
                  Uncategorized
                </button>
                {collections.map(col => (
                  <button
                    key={col.id}
                    onClick={() => moveToCollection(moveOutfit, col.id)}
                    className="py-3 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-sm text-left px-4 hover:border-fuchsia-400 transition-colors"
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
