import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: '🏠', title: 'Home' },
  { to: '/closet', label: '👗', title: 'Wardrobe' },
  { to: '/generate', label: '✨', title: 'AI Picks' },
  { to: '/arcade', label: '🎮', title: 'Arcade' },
  { to: '/saved', label: '❤️', title: 'Outfits' },
  { to: '/planner', label: '📅', title: 'Calendar' },
]

export default function Nav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-stone-950/90 backdrop-blur-md border-t border-stone-100 dark:border-stone-800">
      <div className="max-w-lg mx-auto flex">
        {LINKS.map(({ to, label, title }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={title}
            className={({ isActive }) =>
              [
                'flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xl transition-all',
                isActive
                  ? 'text-fuchsia-500 scale-110'
                  : 'text-stone-400 dark:text-stone-600 hover:text-fuchsia-400',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span>{label}</span>
                <span
                  className={[
                    'text-[9px] font-semibold uppercase tracking-wider',
                    isActive ? 'text-fuchsia-500' : 'text-stone-400 dark:text-stone-600',
                  ].join(' ')}
                >
                  {title}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
