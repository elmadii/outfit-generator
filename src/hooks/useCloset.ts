import { useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { storage } from '../lib/storage'
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

  const save = useCallback((updated: ClosetItem[]) => {
    storage.setItems(updated)
    setItems(updated)
  }, [])

  const addItem = useCallback((item: NewItem) => {
    const newItem: ClosetItem = {
      ...item,
      id: uuid(),
      createdAt: Date.now(),
      timesUsed: 0,
    }
    save([...storage.getItems(), newItem])
  }, [save])

  const updateItem = useCallback((id: string, patch: Partial<ClosetItem>) => {
    save(storage.getItems().map(i => i.id === id ? { ...i, ...patch } : i))
  }, [save])

  const deleteItem = useCallback((id: string) => {
    save(storage.getItems().filter(i => i.id !== id))
  }, [save])

  return { items, addItem, updateItem, deleteItem }
}
