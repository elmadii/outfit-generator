import type { ClosetItem, SavedOutfit, Collection, WearEntry } from '../types'

const DB_NAME = 'fitcheck-v1'
const DB_VERSION = 3

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      ;['items', 'saved', 'collections', 'planner', 'wearLog'].forEach(s => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' })
      })
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => res(req.result as T[])
    req.onerror = () => rej(req.error)
  })
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function idbPut(db: IDBDatabase, store: string, val: any): Promise<void> {
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(val)
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}
function idbDel(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key)
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}
function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).clear()
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

let _db: IDBDatabase | null = null
let _items: ClosetItem[] = []
let _saved: SavedOutfit[] = []
let _collections: Collection[] = []
let _pairings: Record<string, number> = {}
let _planner: Record<string, string> = {} // date (YYYY-MM-DD) -> outfitId
let _wearLog: WearEntry[] = []
let _initPromise: Promise<void> | null = null

function getDB(): Promise<IDBDatabase> {
  if (!_db) return openDB().then(db => { _db = db; return db })
  return Promise.resolve(_db!)
}

async function _doInit(): Promise<void> {
  const db = await getDB()
  _items = await idbGetAll<ClosetItem>(db, 'items')
  _items.sort((a, b) => b.createdAt - a.createdAt)
  _saved = await idbGetAll<SavedOutfit>(db, 'saved')
  _collections = await idbGetAll<Collection>(db, 'collections')
  const plannerEntries = await idbGetAll<{ id: string; outfitId: string }>(db, 'planner')
  _planner = {}
  plannerEntries.forEach(e => { _planner[e.id] = e.outfitId })
  _wearLog = await idbGetAll<WearEntry>(db, 'wearLog')
  _wearLog.sort((a, b) => b.createdAt - a.createdAt)

  try {
    const oldItems = localStorage.getItem('fitcheck:items')
    if (oldItems && _items.length === 0) {
      const parsed = JSON.parse(oldItems) as ClosetItem[]
      _items = parsed
      for (const item of parsed) await idbPut(db, 'items', item)
      localStorage.removeItem('fitcheck:items')
    }
    const oldSaved = localStorage.getItem('fitcheck:saved')
    if (oldSaved && _saved.length === 0) {
      const parsed = JSON.parse(oldSaved) as SavedOutfit[]
      _saved = parsed
      for (const s of parsed) await idbPut(db, 'saved', s)
      localStorage.removeItem('fitcheck:saved')
    }
    const oldCols = localStorage.getItem('fitcheck:collections')
    if (oldCols && _collections.length === 0) {
      const parsed = JSON.parse(oldCols) as Collection[]
      _collections = parsed
      for (const c of parsed) await idbPut(db, 'collections', c)
      localStorage.removeItem('fitcheck:collections')
    }
  } catch (_e) {
    // migration failed, continue with IndexedDB data
  }
}

export function initStorage(): Promise<void> {
  if (!_initPromise) _initPromise = _doInit()
  return _initPromise!
}

export const storage = {
  getItems: () => _items,
  addItem: (item: ClosetItem) => {
    _items = [item, ..._items]
    getDB().then(db => idbPut(db, 'items', item)).catch(() => undefined)
  },
  updateItem: (id: string, patch: Partial<ClosetItem>) => {
    _items = _items.map(i => i.id === id ? { ...i, ...patch } : i)
    const item = _items.find(i => i.id === id)
    if (item) getDB().then(db => idbPut(db, 'items', item)).catch(() => undefined)
  },
  deleteItem: (id: string) => {
    _items = _items.filter(i => i.id !== id)
    getDB().then(db => idbDel(db, 'items', id)).catch(() => undefined)
  },
  setItems: (items: ClosetItem[]) => {
    _items = items
    getDB().then(async db => {
      await idbClear(db, 'items')
      for (const item of items) await idbPut(db, 'items', item)
    }).catch(() => undefined)
  },

  getSaved: () => _saved,
  setSaved: (saved: SavedOutfit[]) => {
    _saved = saved
    getDB().then(async db => {
      await idbClear(db, 'saved')
      for (const s of saved) await idbPut(db, 'saved', s)
    }).catch(() => undefined)
  },

  getCollections: () => _collections,
  setCollections: (cols: Collection[]) => {
    _collections = cols
    getDB().then(async db => {
      await idbClear(db, 'collections')
      for (const c of cols) await idbPut(db, 'collections', c)
    }).catch(() => undefined)
  },

  recordPairing: (ids: string[]) => {
    ids.forEach(a => ids.forEach(b => {
      if (a !== b) _pairings[`${a}:${b}`] = (_pairings[`${a}:${b}`] || 0) + 1
    }))
  },
  getPairings: () => _pairings,
  getPairingScore: (a: string, b: string) => _pairings[`${a}:${b}`] || _pairings[`${b}:${a}`] || 0,

  getPlanner: () => ({ ..._planner }),
  setPlannerEntry: (date: string, outfitId: string) => {
    _planner = { ..._planner, [date]: outfitId }
    getDB().then(db => idbPut(db, 'planner', { id: date, outfitId })).catch(() => undefined)
  },
  removePlannerEntry: (date: string) => {
    const next = { ..._planner }
    delete next[date]
    _planner = next
    getDB().then(db => idbDel(db, 'planner', date)).catch(() => undefined)
  },

  getWearLog: () => [..._wearLog],
  addWearEntry: (entry: WearEntry) => {
    _wearLog = [entry, ..._wearLog]
    getDB().then(db => idbPut(db, 'wearLog', entry)).catch(() => undefined)
  },
  updateWearEntry: (id: string, patch: Partial<WearEntry>) => {
    _wearLog = _wearLog.map(e => e.id === id ? { ...e, ...patch } : e)
    const entry = _wearLog.find(e => e.id === id)
    if (entry) getDB().then(db => idbPut(db, 'wearLog', entry)).catch(() => undefined)
  },
  deleteWearEntry: (id: string) => {
    _wearLog = _wearLog.filter(e => e.id !== id)
    getDB().then(db => idbDel(db, 'wearLog', id)).catch(() => undefined)
  },

  getStylePrefs: (): StylePrefs | null => {
    try {
      const raw = localStorage.getItem('fitcheck:style-prefs')
      return raw ? JSON.parse(raw) as StylePrefs : null
    } catch { return null }
  },
  setStylePrefs: (prefs: StylePrefs) => {
    try { localStorage.setItem('fitcheck:style-prefs', JSON.stringify(prefs)) } catch { /* ignore */ }
  },

  getTheme: (): 'light' | 'dark' => { try { return (localStorage.getItem('fitcheck:theme') as 'light' | 'dark') || 'light' } catch (_e) { return 'light' } },
  setTheme: (t: string) => { try { localStorage.setItem('fitcheck:theme', t) } catch (_e) { /* ignore */ } },
}

export interface StylePrefs {
  aesthetics: string[]    // chosen vibe tags / custom
  lifestyle: string       // e.g. "student", "professional", "creative"
  avoidColors: string[]
  extraContext: string    // free text
}
