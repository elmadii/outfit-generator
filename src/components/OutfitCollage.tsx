import type { ClosetItem } from '../types'

// Each category's default position on the collage canvas (% of container)
const LAYOUT: Record<string, { top: string; left?: string; right?: string; width: string; zIndex: number }> = {
  layer:       { top: '0%',   left: '8%',  width: '76%', zIndex: 1 },
  tops:        { top: '6%',   left: '16%', width: '62%', zIndex: 2 },
  bottoms:     { top: '38%',  left: '14%', width: '66%', zIndex: 0 },
  shoes:       { top: '68%',  left: '20%', width: '55%', zIndex: 3 },
  bags:        { top: '28%',  right: '2%', width: '35%', zIndex: 4 },
  accessories: { top: '4%',   left: '3%',  width: '20%', zIndex: 5 },
}

interface Props {
  items: { item: ClosetItem; cat: string }[]
  bg?: string
  className?: string
}

export default function OutfitCollage({ items, bg = '#FFFFFF', className = '' }: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ paddingBottom: '128%', background: bg }}
    >
      {items.map(({ item, cat }) => {
        const l = LAYOUT[cat]
        if (!l) return null
        return (
          <img
            key={item.id}
            src={item.image}
            alt={item.name}
            draggable={false}
            className="absolute object-contain select-none pointer-events-none"
            style={{
              top: l.top,
              left: l.left,
              right: l.right,
              width: l.width,
              zIndex: l.zIndex,
            }}
          />
        )
      })}
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-stone-300 text-sm">–</p>
        </div>
      )}
    </div>
  )
}
