import { motion } from 'framer-motion'
import type { ClosetItem } from '../types'
import { CATEGORY_EMOJI, VIBE_EMOJI } from '../types'
import { colorHex } from '../lib/colorTheory'

interface Props {
  item: ClosetItem
  onClick?: () => void
  onDelete?: () => void
  compact?: boolean
  selected?: boolean
}

export default function ItemCard({ item, onClick, onDelete, compact, selected }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2, scale: 1.02 }}
      onClick={onClick}
      className={[
        'relative rounded-2xl overflow-hidden cursor-pointer group',
        'bg-white dark:bg-neutral-900',
        'border-2 transition-all',
        selected
          ? 'border-fuchsia-500 ring-2 ring-fuchsia-300'
          : 'border-transparent hover:border-fuchsia-300',
        'shadow-sm hover:shadow-md',
        compact ? '' : 'flex flex-col',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={compact ? 'aspect-square' : 'aspect-[3/4]'}>
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {!compact && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}

      <span className="absolute top-2 left-2 text-base leading-none">
        {CATEGORY_EMOJI[item.category]}
      </span>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500"
        >
          ×
        </button>
      )}

      {!compact && (
        <div className="p-2.5 flex flex-col gap-1">
          <p className="font-semibold text-xs truncate text-neutral-800 dark:text-neutral-100">
            {item.name}
          </p>
          {item.colors.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {item.colors.map((c) => (
                <span
                  key={c}
                  className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-sm"
                  title={c}
                  style={{ background: colorHex(c) }}
                />
              ))}
            </div>
          )}
          {item.vibes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.vibes.slice(0, 2).map((v) => (
                <span
                  key={v}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300"
                >
                  {VIBE_EMOJI[v]} {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
