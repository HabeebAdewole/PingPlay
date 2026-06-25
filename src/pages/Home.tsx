import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export default function Home() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function createRoom(gameType: 'basketball' | 'archery') {
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch(`${SERVER_URL}/room/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType }),
    })
    const { roomId } = await res.json()
    sessionStorage.setItem('playerName', name.trim())
    sessionStorage.setItem('gameType', gameType)
    navigate(`/room/${roomId}`)
  }

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(to bottom, #0a1628, #0d1f3c)' }}>
      <h1 className="text-5xl font-black mb-1 tracking-tight">PingPlay</h1>
      <p className="text-white/40 mb-10 tracking-wide">Challenge your friends to mini-games</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createRoom('basketball')}
          maxLength={20}
          className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
        />

        <p className="text-white/30 text-xs text-center tracking-widest uppercase mt-1">Choose a game</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => createRoom('basketball')}
            disabled={!name.trim() || loading}
            className="flex flex-col items-center gap-2 bg-orange-600/20 hover:bg-orange-600/35 border border-orange-500/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl px-4 py-5 transition-colors"
          >
            <span className="text-3xl">🏀</span>
            <span className="text-white font-semibold text-sm">Basketball</span>
            <span className="text-white/40 text-xs">30s · swipe to shoot</span>
          </button>

          <button
            onClick={() => createRoom('archery')}
            disabled={!name.trim() || loading}
            className="flex flex-col items-center gap-2 bg-green-700/20 hover:bg-green-700/35 border border-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl px-4 py-5 transition-colors"
          >
            <span className="text-3xl">🏹</span>
            <span className="text-white font-semibold text-sm">Archery</span>
            <span className="text-white/40 text-xs">3 arrows · wind drift</span>
          </button>
        </div>
      </div>
    </div>
  )
}
