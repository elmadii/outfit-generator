import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

export function getDeviceId(): string {
  let id = localStorage.getItem('fitcheck:device_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('fitcheck:device_id', id) }
  return id
}
