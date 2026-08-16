import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: '🏠', title: 'Home' },
  { to: '/upload', label: '📸', title: 'Upload' },
  { to: '/closet', label: '👗', title: 'Closet' },
  { to: '/generate', label: '✨', title: 'Generate' },
  { to: '/arcade', label: '🎮', title: 'Arcade' },
  { to: '/saved', label: '❤️', title: 'Saved' },
]

export default function Nav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800">
      <div className="max-w-lg mx-auto flex">
        {LINKS.map(({ to, label, title }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={title}
            className={({ isActive }) =>
              [
                'flex-1 flex flex-col items-center py-3 gap-0.5 text-xl transition-all',
                isActive
                  ? 'text-fuchsia-500 scale-110'
                  : 'text-neutral-400 dark:text-neutral-600 hover:text-fuchsia-400',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span>{label}</span>
                <span
                  className={[
                    'text-[9px] font-semibold uppercase tracking-wider',
                    isActive ? 'text-fuchsia-500' : 'text-neutral-400 dark:text-neutral-600',
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
