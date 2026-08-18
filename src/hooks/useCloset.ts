import { useState, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { storage, initStorage } from '../lib/storage'
import type { ClosetItem, Category, VibeTag } from '../types'

interface NewItem {
  image: string
  category: Category
  name: string
  colors: string[]
  vibes: VibeTag[]
  customVibes?: string[]
  aiDescription?: string
  notes?: string
}

export function useCloset() {
  const [items, setItems] = useState<ClosetItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initStorage().then(() => {
      setItems(storage.getItems())
      setLoading(false)
    })
  }, [])

  const addItem = useCallback((item: NewItem) => {
    const newItem: ClosetItem = { ...item, id: uuid(), createdAt: Date.now(), timesUsed: 0 }
    storage.addItem(newItem)
    setItems(prev => [newItem, ...prev])
  }, [])

  const updateItem = useCallback((id: string, patch: Partial<ClosetItem>) => {
    storage.updateItem(id, patch)
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }, [])

  const deleteItem = useCallback((id: string) => {
    storage.deleteItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  return { items, loading, syncing: false, addItem, updateItem, deleteItem }
}
