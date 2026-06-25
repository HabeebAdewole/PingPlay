import { supabase } from './supabase'
import type { ScoreRow } from './supabase'

export async function saveScore(entry: ScoreRow): Promise<void> {
  if (!supabase) return // Supabase not configured
  try {
    await supabase.from('scores').insert(entry)
  } catch {
    // Fail silently — score saving is non-critical
  }
}

export async function getLeaderboard(gameType: 'basketball' | 'archery', limit = 10) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, score, mode, created_at')
    .eq('game_type', gameType)
    .order('score', { ascending: false })
    .limit(limit)
  if (error) return []
  return data ?? []
}
