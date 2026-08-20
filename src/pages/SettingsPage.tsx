import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { storage } from '../lib/storage'

const CURRENCIES = [
  { label: '€ EUR', value: 'EUR' },
  { label: '$ USD', value: 'USD' },
  { label: '£ GBP', value: 'GBP' },
  { label: 'C$ CAD', value: 'CAD' },
  { label: 'A$ AUD', value: 'AUD' },
  { label: 'NZ$ NZD', value: 'NZD' },
  { label: 'R$ BRL', value: 'BRL' },
  { label: 'Mex$ MXN', value: 'MXN' },
]

function getProfile() {
  try {
    const raw = localStorage.getItem('fitcheck:profile')
    return raw ? JSON.parse(raw) : { displayName: '', username: 'malak_el_madi', currency: 'EUR' }
  } catch { return { displayName: '', username: 'malak_el_madi', currency: 'EUR' } }
}

function setProfile(p: { displayName: string; username: string; currency: string }) {
  try { localStorage.setItem('fitcheck:profile', JSON.stringify(p)) } catch { /* ignore */ }
}

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [saved, setSaved] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'default' | 'granted' | 'denied'>('default')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const p = getProfile()
    setDisplayName(p.displayName || '')
    setUsername(p.username || '')
    setCurrency(p.currency || 'EUR')
    if ('Notification' in window) setNotifStatus(Notification.permission as 'default' | 'granted' | 'denied')
  }, [])

  function handleSave() {
    const trimmedUsername = username.trim().replace(/[^a-z0-9_]/gi, '_').slice(0, 30)
    if (trimmedUsername.length < 3) return
    setProfile({ displayName: displayName.trim(), username: trimmedUsername, currency })
    setUsername(trimmedUsername)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleEnableNotifications() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifStatus(result as 'default' | 'granted' | 'denied')
  }

  function handleDeleteAccount() {
    localStorage.clear()
    indexedDB.deleteDatabase('fitcheck-v1')
    window.location.href = '/'
  }

  const themeData = storage.getTheme()
  const prefs = storage.getStylePrefs()

  return (
    <div className="min-h-dvh pb-28">
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          paramètres du compte
        </h1>
      </div>

      <div className="px-4 space-y-4">

        {/* profil */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-100 dark:border-stone-800">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-4">profil</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">nom affiché</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Malak El Madi"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
              />
              <p className="mt-1 text-xs text-stone-400">affiché sur l'accueil. laisse vide pour utiliser ton nom d'utilisateur.</p>
            </div>

            <div>
              <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">nom d'utilisateur</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
              />
              <p className="mt-1 text-xs text-stone-400">lettres, chiffres et tirets bas uniquement. 3 à 30 caractères.</p>
            </div>

            <div>
              <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">email</label>
              <div className="w-full rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 px-4 py-3 text-sm text-stone-400">
                local — pas de compte requis
              </div>
            </div>

            <div>
              <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">devise</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-400">utilisée pour les prix de ta garde-robe et le coût par port.</p>
            </div>

            <button
              onClick={handleSave}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
            >
              {saved ? 'enregistré ✓' : 'enregistrer'}
            </button>
          </div>

          <hr className="my-5 border-stone-100 dark:border-stone-800" />

          {/* style section inside profil card */}
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">style, présentation & localisation</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
              ton style habituel, ta présentation (féminine / masculine / androgyne / fluide), ta coupe, tes couleurs préférées, ton âge, tes objectifs, ton budget — et ta ville, qui pilote les tenues selon la météo.
            </p>
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-medium px-5 py-3 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              modifier style, présentation &amp; localisation
            </Link>
            {prefs && (
              <p className="mt-2 text-xs text-stone-400">
                vibes actives : {prefs.aesthetics.slice(0, 3).join(', ')}{prefs.aesthetics.length > 3 ? ` +${prefs.aesthetics.length - 3}` : ''}
              </p>
            )}
          </div>
        </section>

        {/* abonnement */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-100 dark:border-stone-800">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-3">abonnement</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500 dark:text-stone-400">Gratuit</span>
            <button className="text-sm font-medium text-fuchsia-500 hover:text-fuchsia-600 transition-colors">
              voir les offres
            </button>
          </div>
        </section>

        {/* budget mensuel */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-100 dark:border-stone-800">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">budget mensuel</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-3 leading-relaxed">
            un objectif de dépense vêtements pour ce mois-ci. suivi selon les pièces avec une date d'achat renseignée.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 text-xs font-bold px-2 py-0.5 rounded-md tracking-wide">PRO</span>
            <p className="text-xs text-stone-400">définis un budget vêtements mensuel et suis tes dépenses en temps réel sur le tableau de bord.</p>
          </div>
          <button className="text-sm font-medium text-fuchsia-500 hover:text-fuchsia-600 transition-colors">
            voir les offres
          </button>
        </section>

        {/* notifications */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-100 dark:border-stone-800">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">notifications</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
            reçois des notifications push sur cet appareil. fonctionne sur chrome, edge, firefox (bureau + android) et safari 16+.
          </p>

          {notifStatus === 'granted' ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              notifications activées
            </div>
          ) : notifStatus === 'denied' ? (
            <p className="text-sm text-red-500">notifications bloquées — autorise-les dans les réglages du navigateur.</p>
          ) : (
            <button
              onClick={handleEnableNotifications}
              className="border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              enable notifications
            </button>
          )}

          <hr className="my-4 border-stone-100 dark:border-stone-800" />

          <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-3">quoi envoyer</p>
          <div className="space-y-3">
            {[
              { label: 'suggestion quotidienne', desc: 'push du matin avec le look du jour', badge: null },
              { label: 'rappel du calendrier', desc: 'push du soir la veille d\'une tenue planifiée', badge: 'premium' },
              { label: 'alerte météo', desc: 'push du matin quand la météo peut affecter ton look prévu', badge: 'premium' },
              { label: 'récap hebdo', desc: 'dimanche soir — ta semaine en tenues', badge: 'pro' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2">
                <div className="mt-1 w-2 h-2 rounded-full bg-fuchsia-500 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-700 dark:text-stone-300">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-stone-400 italic">passer à pro pour personnaliser quelles notifications s'activent.</p>
        </section>

        {/* theme */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-100 dark:border-stone-800">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-3">apparence</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600 dark:text-stone-400">
              {themeData === 'dark' ? 'mode sombre' : 'mode clair'}
            </span>
            <button
              onClick={() => {
                const next = themeData === 'dark' ? 'light' : 'dark'
                storage.setTheme(next)
                document.documentElement.classList.toggle('dark', next === 'dark')
                window.location.reload()
              }}
              className="border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm px-4 py-2 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              {themeData === 'dark' ? '☀️ mode clair' : '🌙 mode sombre'}
            </button>
          </div>
        </section>

        {/* zone sensible */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-red-100 dark:border-red-900/30">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1">zone sensible</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            supprime définitivement toutes tes données locales (garde-robe, tenues, calendrier).
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              supprimer le compte
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Tu es sûre ? Cette action est irréversible.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                >
                  oui, tout supprimer
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-sm px-4 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  annuler
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
