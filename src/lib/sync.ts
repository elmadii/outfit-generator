import { supabase, getDeviceId } from './supabase'
import type { ClosetItem, SavedOutfit, Collection } from '../types'

const uid = () => getDeviceId()

export async function syncItemsUp(items: ClosetItem[]) {
  if (!items.length) return
  const rows = items.map(i => ({ ...i, user_id: uid(), created_at: i.createdAt, times_used: i.timesUsed }))
  await supabase.from('closet_items').upsert(rows, { onConflict: 'id' })
}

export async function syncItemsDown(): Promise<ClosetItem[]> {
  const { data } = await supabase.from('closet_items').select('*').eq('user_id', uid()).order('created_at', { ascending: false })
  if (!data) return []
  return data.map(r => ({ id: r.id, category: r.category, image: r.image, name: r.name, colors: r.colors ?? [], vibes: r.vibes ?? [], notes: r.notes, createdAt: r.created_at, timesUsed: r.times_used ?? 0 }))
}

export async function pushItem(item: ClosetItem) {
  await supabase.from('closet_items').upsert({ ...item, user_id: uid(), created_at: item.createdAt, times_used: item.timesUsed }, { onConflict: 'id' })
}

export async function deleteItemRemote(id: string) {
  await supabase.from('closet_items').delete().eq('id', id).eq('user_id', uid())
}

export async function syncSavedUp(saved: SavedOutfit[]) {
  if (!saved.length) return
  const rows = saved.map(s => ({ id: s.id, user_id: uid(), picks: s.picks, score: s.score, vibe_name: s.vibeName, reason: s.reason, dominant_vibe: s.dominantVibe, saved_at: s.savedAt, collection_id: s.collectionId ?? null }))
  await supabase.from('saved_outfits').upsert(rows, { onConflict: 'id' })
}

export async function syncSavedDown(): Promise<SavedOutfit[]> {
  const { data } = await supabase.from('saved_outfits').select('*').eq('user_id', uid()).order('saved_at', { ascending: false })
  if (!data) return []
  return data.map(r => ({ id: r.id, picks: r.picks, score: r.score, vibeName: r.vibe_name, reason: r.reason, dominantVibe: r.dominant_vibe, savedAt: r.saved_at, collectionId: r.collection_id, createdAt: r.saved_at }))
}

export async function syncCollectionsUp(cols: Collection[]) {
  if (!cols.length) return
  const rows = cols.map(c => ({ ...c, user_id: uid(), created_at: c.createdAt }))
  await supabase.from('collections').upsert(rows, { onConflict: 'id' })
}

export async function syncCollectionsDown(): Promise<Collection[]> {
  const { data } = await supabase.from('collections').select('*').eq('user_id', uid())
  if (!data) return []
  return data.map(r => ({ id: r.id, name: r.name, createdAt: r.created_at }))
}
