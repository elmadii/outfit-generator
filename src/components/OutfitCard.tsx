import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { GeneratedOutfit, ClosetItem } from '../types'
import { outfitItems } from '../lib/outfitEngine'

interface Props {
  outfit: GeneratedOutfit
  itemMap: Map<string, ClosetItem>
  isSaved: boolean
  onSave: () => void
  onUnsave: () => void
  onClick?: () => void
}

export default function OutfitCard({ outfit, itemMap, isSaved, onSave, onUnsave, onClick }: Props) {
  const items = outfitItems(outfit, itemMap)
  const [heartAnim, setHeartAnim] = useState(false)

  const handleHeart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSaved) {
      setHeartAnim(true)
      setTimeout(() => setHeartAnim(false), 700)
      onSave()
    } else {
      onUnsave()
    }
  }

  const scoreColor =
    outfit.score >= 85
      ? 'text-green-500'
      : outfit.score >= 70
        ? 'text-yellow-500'
        : 'text-rose-400'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-neutral-100 dark:border-neutral-800 cursor-pointer group transition-shadow"
    >
      <div className="grid grid-cols-3 gap-0.5 bg-neutral-100 dark:bg-neutral-800">
        {items.slice(0, 3).map((item) => (
          <div key={item.id} className="aspect-square overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-100 leading-tight">
            {outfit.vibeName}
          </span>
          <span className={`font-bold text-sm tabular-nums ${scoreColor}`}>{outfit.score}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <span key={item.id} className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              · {item.name}
            </span>
          ))}
        </div>

        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-snug line-clamp-2">
          {outfit.reason}
        </p>

        <div className="relative flex justify-end">
          <AnimatePresence>
            {heartAnim && (
              <motion.span
                key="float"
                initial={{ y: 0, opacity: 1, scale: 1 }}
                animate={{ y: -36, opacity: 0, scale: 1.8 }}
                transition={{ duration: 0.6 }}
                className="absolute -top-2 right-0 text-lg pointer-events-none"
              >
                ❤️
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={handleHeart}
            className="text-xl transition-transform hover:scale-125 active:scale-90"
            aria-label={isSaved ? 'Remove from saved' : 'Save outfit'}
          >
            {isSaved ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
