import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import type { Category, VibeTag, DraftItem } from '../types'
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_EMOJI, VIBE_TAGS, VIBE_EMOJI } from '../types'
import { COLOR_NAMES, colorHex } from '../lib/colorTheory'
import { fileToDataUrl, resizeImage, removeBackground } from '../lib/imageUtils'
import { useCloset } from '../hooks/useCloset'

interface DraftWithMeta extends DraftItem {
  name: string
  colors: string[]
  vibes: VibeTag[]
  notes: string
  removing: boolean
  removed: boolean
}

export default function UploadPage() {
  const { addItem } = useCloset()
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<DraftWithMeta[]>([])
  const [current, setCurrent] = useState(0)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    const newDrafts: DraftWithMeta[] = []
    for (const file of Array.from(files)) {
      const raw = await fileToDataUrl(file)
      const resized = await resizeImage(raw, 700)
      newDrafts.push({
        id: uuid(), image: resized, category: 'tops',
        box: { x: 0, y: 0, w: 1, h: 1 },
        name: '', colors: [], vibes: [], notes: '',
        removing: false, removed: false,
      })
    }
    setDrafts((prev) => {
      const merged = [...prev, ...newDrafts]
      setCurrent(prev.length)
      return merged
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    onFiles(e.dataTransfer.files)
  }, [onFiles])

  const handleRemoveBg = async (idx: number) => {
    setDrafts((prev) => prev.map((d, i) => i === idx ? { ...d, removing: true } : d))
    const result = await removeBackground(drafts[idx].image)
    setDrafts((prev) => prev.map((d, i) => i === idx ? { ...d, removing: false, removed: true, image: result } : d))
  }

  const update = (idx: number, patch: Partial<DraftWithMeta>) =>
    setDrafts((prev) => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))

  const toggleColor = (idx: number, color: string) => {
    const colors = drafts[idx].colors
    update(idx, { colors: colors.includes(color) ? colors.filter(c => c !== color) : [...colors, color] })
  }

  const toggleVibe = (idx: number, vibe: VibeTag) => {
    const vibes = drafts[idx].vibes
    update(idx, { vibes: vibes.includes(vibe) ? vibes.filter(v => v !== vibe) : [...vibes, vibe] })
  }

  const removeItem = (idx: number) => {
    const next = drafts.filter((_, i) => i !== idx)
    setDrafts(next)
    setCurrent(Math.min(current, Math.max(0, next.length - 1)))
  }

  const saveAll = async () => {
    setSaving(true)
    for (const d of drafts) {
      addItem({ image: d.image, category: d.category, name: d.name.trim() || 'Untitled', colors: d.colors, vibes: d.vibes, notes: d.notes.trim() || undefined })
    }
    setSaving(false)
    navigate('/closet')
  }

  const d = drafts[current]
  const named = drafts.filter(x => x.name.trim()).length
  const canSave = drafts.length > 0 && drafts.every(d => d.name.trim())

  return (
    <div className="min-h-screen flex flex-col pb-24 max-w-lg mx-auto">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">📸 Add Items</h1>
        <p className="text-sm text-neutral-400 mt-1">One photo per item works best. Plain background = cleaner result.</p>
      </div>

      {/* drop zone */}
      <div className="px-5 mb-4">
        <motion.div
          whileTap={{ scale: 0.97 }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-3xl border-2 border-dashed border-fuchsia-200 dark:border-fuchsia-900 bg-fuchsia-50/50 dark:bg-fuchsia-950/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/30 transition-colors py-8"
        >
          <span className="text-4xl">🖼️</span>
          <p className="text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400">Drop photos or tap to browse</p>
          <p className="text-xs text-neutral-400">Multiple photos allowed · one item per photo</p>
        </motion.div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {/* thumbnail strip */}
      {drafts.length > 0 && (
        <div className="px-5 mb-4">
          {/* progress */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-500">
              {named}/{drafts.length} named
              {named < drafts.length && <span className="text-fuchsia-500 ml-2">← name each item to unlock save</span>}
            </p>
            <div className="h-1.5 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-rose-500 rounded-full"
                animate={{ width: `${(named / drafts.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {drafts.map((dr, i) => (
              <button
                key={dr.id}
                onClick={() => setCurrent(i)}
                className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === current ? 'border-fuchsia-500 ring-2 ring-fuchsia-200' : dr.name ? 'border-green-300 opacity-70' : 'border-transparent opacity-40'}`}
              >
                <img src={dr.image} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* editor */}
      {d && (
        <AnimatePresence mode="wait">
          <motion.div
            key={d.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-5 px-5"
          >
            {/* preview + remove bg */}
            <div className="flex gap-4 items-start">
              <div
                className="w-36 h-44 rounded-2xl overflow-hidden shrink-0 shadow"
                style={{
                  background: d.removed
                    ? 'repeating-conic-gradient(#e9d5ff 0% 25%, #f5f3ff 0% 50%) 0 0 / 14px 14px'
                    : '#f3f4f6',
                }}
              >
                <img src={d.image} alt="" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => handleRemoveBg(current)}
                  disabled={d.removing || d.removed}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${d.removed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900/50'} ${d.removing ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {d.removing ? '⏳ Removing…' : d.removed ? '✅ BG removed' : '✂️ Remove BG'}
                </button>
                <button
                  onClick={() => removeItem(current)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100"
                >
                  🗑 Remove item
                </button>
              </div>
            </div>

            {/* name */}
            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                Item name <span className="text-fuchsia-500">*</span>
              </label>
              <input
                type="text"
                value={d.name}
                onChange={(e) => update(current, { name: e.target.value })}
                placeholder="e.g. Gray Oversized Hoodie"
                className="w-full rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-400 transition-colors"
              />
            </div>

            {/* category */}
            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 block">Category</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => update(current, { category: cat as Category })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${d.category === cat ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-fuchsia-300'}`}
                  >
                    {CATEGORY_EMOJI[cat as Category]} {CATEGORY_LABEL[cat as Category]}
                  </button>
                ))}
              </div>
            </div>

            {/* colors */}
            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 block">Colors</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_NAMES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleColor(current, c)}
                    title={c}
                    className={`w-7 h-7 rounded-full border-3 transition-all hover:scale-110 active:scale-90 ${d.colors.includes(c) ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 scale-110' : 'border-white/80 shadow-sm'}`}
                    style={{ background: colorHex(c), borderWidth: d.colors.includes(c) ? 3 : 2, borderColor: d.colors.includes(c) ? '#d946ef' : 'rgba(255,255,255,0.8)' }}
                  />
                ))}
              </div>
              {d.colors.length > 0 && (
                <p className="text-xs text-neutral-400 mt-2">✓ {d.colors.join(', ')}</p>
              )}
            </div>

            {/* vibes */}
            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 block">Vibe</label>
              <div className="flex gap-2 flex-wrap">
                {VIBE_TAGS.map((v) => (
                  <button
                    key={v}
                    onClick={() => toggleVibe(current, v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${d.vibes.includes(v) ? 'bg-rose-500 border-rose-500 text-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-rose-300'}`}
                  >
                    {VIBE_EMOJI[v as VibeTag]} {v}
                  </button>
                ))}
              </div>
            </div>

            {/* notes */}
            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 block">Notes (optional)</label>
              <input
                type="text"
                value={d.notes}
                onChange={(e) => update(current, { notes: e.target.value })}
                placeholder="fits oversized, slightly worn, gift from sister…"
                className="w-full rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-400 transition-colors"
              />
            </div>

            {/* nav */}
            <div className="flex gap-3 pb-2">
              <button
                disabled={current === 0}
                onClick={() => setCurrent(c => c - 1)}
                className="flex-1 py-3 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-sm font-semibold disabled:opacity-30 hover:border-fuchsia-300 transition-colors"
              >
                ← Prev
              </button>
              {current < drafts.length - 1 ? (
                <button
                  onClick={() => setCurrent(c => c + 1)}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-bold shadow-md"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={saveAll}
                  disabled={!canSave || saving}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-bold shadow-md disabled:opacity-40 transition-opacity"
                >
                  {saving ? '⏳ Saving…' : `💾 Save ${drafts.length} item${drafts.length > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
