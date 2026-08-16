import { useState, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { storage } from '../lib/storage'
import { pushItem, deleteItemRemote, syncItemsDown } from '../lib/sync'
import type { ClosetItem, Category, VibeTag } from '../types'

interface NewItem {
  image: string
  category: Category
  name: string
  colors: string[]
  vibes: VibeTag[]
  notes?: string
}

export function useCloset() {
  const [items, setItems] = useState<ClosetItem[]>(() => storage.getItems())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setSyncing(true)
    syncItemsDown().then(cloudItems => {
      if (cloudItems.length > 0) {
        storage.setItems(cloudItems)
        setItems(cloudItems)
      }
    }).finally(() => setSyncing(false))
  }, [])

  const save = useCallback((updated: ClosetItem[]) => {
    storage.setItems(updated)
    setItems(updated)
  }, [])

  const addItem = useCallback((item: NewItem) => {
    const newItem: ClosetItem = { ...item, id: uuid(), createdAt: Date.now(), timesUsed: 0 }
    const updated = [...storage.getItems(), newItem]
    save(updated)
    pushItem(newItem)
  }, [save])

  const updateItem = useCallback((id: string, patch: Partial<ClosetItem>) => {
    const updated = storage.getItems().map(i => i.id === id ? { ...i, ...patch } : i)
    save(updated)
    const item = updated.find(i => i.id === id)
    if (item) pushItem(item)
  }, [save])

  const deleteItem = useCallback((id: string) => {
    save(storage.getItems().filter(i => i.id !== id))
    deleteItemRemote(id)
  }, [save])

  return { items, syncing, addItem, updateItem, deleteItem }
}
