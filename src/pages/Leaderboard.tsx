import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard } from '../lib/saveScore'
import { supabase } from '../lib/supabase'

interface Entry {
  player_name: string
  score: number
  mode: string
  created_at: string
}

const MEDAL = ['🥇', '🥈', '🥉']

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'basketball' | 'archery'>('basketball')
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const noSupabase = !supabase

  useEffect(() => {
    setLoading(true)
    getLeaderboard(tab).then((data) => {
      setRows(data as Entry[])
      setLoading(false)
    })
  }, [tab])

  const tabBtn = (t: typeof tab, label: string, emoji: string) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        tab === t ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/70'
      }`}
    >
      <span>{emoji}</span>{label}
    </button>
  )

  return (
    <div className="min-h-screen text-white flex flex-col"
      style={{ background: 'linear-gradient(to bottom, #0a1628, #0d1f3c)' }}>

      {/* Header */}
      <div className="flex items-center px-5 pt-6 pb-4">
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white mr-4 text-xl">←</button>
        <h1 className="text-2xl font-black tracking-tight flex-1">Leaderboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 rounded-2xl p-1 mx-5 mb-6">
        {tabBtn('basketball', 'Basketball', '🏀')}
        {tabBtn('archery', 'Archery', '🏹')}
      </div>

      <div className="flex-1 px-5">
        {noSupabase && (
          <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl px-5 py-4 mb-5 text-center">
            <p className="text-yellow-400 text-sm font-semibold mb-1">Supabase not configured</p>
            <p className="text-yellow-400/60 text-xs">Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local to enable the leaderboard.</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <span className="text-5xl mb-4">{tab === 'basketball' ? '🏀' : '🏹'}</span>
            <p className="text-sm">No scores yet — be the first!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-white/5 border border-white/8 rounded-2xl px-4 py-3"
                style={{ animation: `fadeSlideIn 0.3s ease ${i * 0.05}s both` }}
              >
                <span className="text-xl w-8 text-center">
                  {i < 3 ? MEDAL[i] : <span className="text-white/30 text-sm font-bold">#{i + 1}</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{row.player_name}</p>
                  <p className="text-white/30 text-xs capitalize">{row.mode} · {timeAgo(row.created_at)}</p>
                </div>
                <span className={`text-xl font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-white/70'}`}>
                  {row.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
