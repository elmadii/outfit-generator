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

  const top = items.find(i => i.category === 'tops')
  const bottom = items.find(i => i.category === 'bottoms')
  const shoes = items.find(i => i.category === 'shoes')
  const bag = items.find(i => i.category === 'bags')
  const acc = items.find(i => i.category === 'accessories')
  const rightTop = bag ?? acc
  const rightBottom = shoes

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden cursor-pointer shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
    >
      {/* flat-lay collage */}
      <div className="relative bg-white" style={{ aspectRatio: '3/4' }}>
        {/* left column: top + bottom */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col" style={{ width: '58%', padding: '8% 2% 8% 6%', gap: '4%' }}>
          {top && (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <img src={top.image} alt={top.name} className="max-w-full max-h-full object-contain drop-shadow-sm" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }} />
            </div>
          )}
          {bottom && (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <img src={bottom.image} alt={bottom.name} className="max-w-full max-h-full object-contain" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }} />
            </div>
          )}
        </div>

        {/* right column: bag + shoes */}
        <div className="absolute right-0 top-0 bottom-0 flex flex-col" style={{ width: '44%', padding: '10% 6% 8% 2%', gap: '6%' }}>
          {rightTop && (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <img src={rightTop.image} alt={rightTop.name} className="max-w-full max-h-full object-contain" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />
            </div>
          )}
          {rightBottom && (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <img src={rightBottom.image} alt={rightBottom.name} className="max-w-full max-h-full object-contain" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />
            </div>
          )}
        </div>


      </div>

      {/* footer */}
      <div className="px-3 py-2.5 flex items-center justify-between border-t border-neutral-50">
        <div className="min-w-0">
          <p className="text-xs font-bold text-neutral-800 truncate">{outfit.vibeName}</p>
          <p className="text-[10px] text-neutral-400 truncate">{items.map(i => i.name).join(' · ')}</p>
        </div>
        <div className="relative shrink-0 ml-2">
          <AnimatePresence>
            {heartAnim && (
              <motion.span key="float" initial={{ y: 0, opacity: 1, scale: 1 }} animate={{ y: -28, opacity: 0, scale: 1.8 }} transition={{ duration: 0.55 }}
                className="absolute -top-1 right-0 text-base pointer-events-none">❤️</motion.span>
            )}
          </AnimatePresence>
          <button onClick={handleHeart} className="text-lg transition-transform hover:scale-125 active:scale-90">
            {isSaved ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
