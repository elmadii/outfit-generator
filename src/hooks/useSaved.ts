import { useState, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { storage, initStorage } from '../lib/storage'
import type { GeneratedOutfit, SavedOutfit, Collection } from '../types'

export function useSaved() {
  const [saved, setSaved] = useState<SavedOutfit[]>([])
  const [collections, setCollections] = useState<Collection[]>([])

  useEffect(() => {
    initStorage().then(() => {
      setSaved(storage.getSaved())
      setCollections(storage.getCollections())
    })
  }, [])

  const saveOutfit = useCallback((outfit: GeneratedOutfit, collectionId?: string) => {
    if (storage.getSaved().find(s => s.id === outfit.id)) return
    const s: SavedOutfit = { ...outfit, savedAt: Date.now(), collectionId }
    const updated = [...storage.getSaved(), s]
    storage.setSaved(updated); setSaved(updated)
    storage.recordPairing(Object.values(outfit.picks).filter(Boolean) as string[])
  }, [])

  const unsaveOutfit = useCallback((id: string) => {
    const updated = storage.getSaved().filter(s => s.id !== id)
    storage.setSaved(updated); setSaved(updated)
  }, [])

  const isSaved = useCallback((id: string) => saved.some(s => s.id === id), [saved])

  const addCollection = useCallback((name: string): Collection => {
    const col: Collection = { id: uuid(), name, createdAt: Date.now() }
    const updated = [...storage.getCollections(), col]
    storage.setCollections(updated); setCollections(updated)
    return col
  }, [])

  const deleteCollection = useCallback((id: string) => {
    const cols = storage.getCollections().filter(c => c.id !== id)
    storage.setCollections(cols); setCollections(cols)
    const outfits = storage.getSaved().map(s => s.collectionId === id ? { ...s, collectionId: undefined } : s)
    storage.setSaved(outfits); setSaved(outfits)
  }, [])

  return { saved, collections, saveOutfit, unsaveOutfit, isSaved, addCollection, deleteCollection }
}
