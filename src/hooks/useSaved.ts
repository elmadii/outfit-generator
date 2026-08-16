import { useState, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { storage } from '../lib/storage'
import { syncSavedDown, syncCollectionsDown } from '../lib/sync'
import { supabase, getDeviceId } from '../lib/supabase'
import type { GeneratedOutfit, SavedOutfit, Collection } from '../types'

export function useSaved() {
  const [saved, setSaved] = useState<SavedOutfit[]>(() => storage.getSaved())
  const [collections, setCollections] = useState<Collection[]>(() => storage.getCollections())

  useEffect(() => {
    syncSavedDown().then(data => { if (data.length > 0) { storage.setSaved(data); setSaved(data) } })
    syncCollectionsDown().then(data => { if (data.length > 0) { storage.setCollections(data); setCollections(data) } })
  }, [])

  const saveOutfit = useCallback((outfit: GeneratedOutfit, collectionId?: string) => {
    const existing = storage.getSaved()
    if (existing.find(s => s.id === outfit.id)) return
    const s: SavedOutfit = { ...outfit, savedAt: Date.now(), collectionId }
    const updated = [...existing, s]
    storage.setSaved(updated); setSaved(updated)
    supabase.from('saved_outfits').upsert({ id: s.id, user_id: getDeviceId(), picks: s.picks, score: s.score, vibe_name: s.vibeName, reason: s.reason, dominant_vibe: s.dominantVibe, saved_at: s.savedAt, collection_id: s.collectionId ?? null }, { onConflict: 'id' })
    storage.recordPairing(Object.values(outfit.picks).filter(Boolean) as string[])
  }, [])

  const unsaveOutfit = useCallback((id: string) => {
    const updated = storage.getSaved().filter(s => s.id !== id)
    storage.setSaved(updated); setSaved(updated)
    supabase.from('saved_outfits').delete().eq('id', id).eq('user_id', getDeviceId())
  }, [])

  const isSaved = useCallback((id: string) => saved.some(s => s.id === id), [saved])

  const addCollection = useCallback((name: string): Collection => {
    const col: Collection = { id: uuid(), name, createdAt: Date.now() }
    const updated = [...storage.getCollections(), col]
    storage.setCollections(updated); setCollections(updated)
    supabase.from('collections').upsert({ ...col, user_id: getDeviceId(), created_at: col.createdAt }, { onConflict: 'id' })
    return col
  }, [])

  const deleteCollection = useCallback((id: string) => {
    const cols = storage.getCollections().filter(c => c.id !== id)
    storage.setCollections(cols); setCollections(cols)
    supabase.from('collections').delete().eq('id', id).eq('user_id', getDeviceId())
    const outfits = storage.getSaved().map(s => s.collectionId === id ? { ...s, collectionId: undefined } : s)
    storage.setSaved(outfits); setSaved(outfits)
  }, [])

  return { saved, collections, saveOutfit, unsaveOutfit, isSaved, addCollection, deleteCollection }
}
