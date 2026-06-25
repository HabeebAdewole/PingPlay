import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Client is null when env vars aren't set — all operations fail silently
export const supabase = url && key ? createClient(url, key) : null

export interface ScoreRow {
  id?: string
  player_name: string
  game_type: 'basketball' | 'archery'
  score: number
  mode: 'multiplayer' | 'bot'
  created_at?: string
}
