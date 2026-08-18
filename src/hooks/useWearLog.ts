import { useState, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { storage, initStorage } from '../lib/storage'
import type { WearEntry } from '../types'

export function useWearLog() {
  const [wearLog, setWearLog] = useState<WearEntry[]>([])

  useEffect(() => {
    initStorage().then(() => setWearLog(storage.getWearLog()))
  }, [])

  const logWear = useCallback((date: string, note: string, outfitId?: string) => {
    const entry: WearEntry = { id: uuid(), date, outfitId, note, createdAt: Date.now() }
    storage.addWearEntry(entry)
    setWearLog(storage.getWearLog())
    return entry
  }, [])

  const updateWear = useCallback((id: string, patch: Partial<WearEntry>) => {
    storage.updateWearEntry(id, patch)
    setWearLog(storage.getWearLog())
  }, [])

  const deleteWear = useCallback((id: string) => {
    storage.deleteWearEntry(id)
    setWearLog(storage.getWearLog())
  }, [])

  const getEntriesForDate = useCallback((date: string) =>
    wearLog.filter(e => e.date === date), [wearLog])

  return { wearLog, logWear, updateWear, deleteWear, getEntriesForDate }
}
