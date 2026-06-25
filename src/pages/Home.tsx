import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

type GameType = 'basketball' | 'archery'
type Difficulty = 'easy' | 'medium' | 'hard'

export default function Home() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'friend' | 'bot'>('friend')
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (sessionStorage.getItem('botDifficulty') as Difficulty) || 'medium'
  )
  const navigate = useNavigate()

  async function createRoom(gameType: GameType) {
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

  function playBot(gameType: GameType) {
    sessionStorage.setItem('botDifficulty', difficulty)
    navigate(`/play/${gameType}?difficulty=${difficulty}`)
  }

  const diffBtnClass = (d: Difficulty) =>
    `px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
      difficulty === d
        ? 'bg-indigo-600 text-white'
        : 'bg-white/5 text-white/40 hover:bg-white/10'
    }`

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center px-6 gap-8"
      style={{ background: 'linear-gradient(to bottom, #0a1628, #0d1f3c)' }}>

      <div className="text-center">
        <h1 className="text-5xl font-black mb-1 tracking-tight">PingPlay</h1>
        <p className="text-white/40 tracking-wide">Challenge your friends to mini-games</p>
        <button onClick={() => navigate('/leaderboard')}
          className="mt-3 text-indigo-400/70 hover:text-indigo-400 text-xs tracking-widest uppercase transition-colors">
          🏆 Leaderboard
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setMode('friend')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${mode === 'friend' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/70'}`}
        >
          vs Friend
        </button>
        <button
          onClick={() => setMode('bot')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${mode === 'bot' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/70'}`}
        >
          vs Bot 🤖
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">

        {mode === 'friend' && (
          <>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createRoom('basketball')}
              maxLength={20}
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-white/30 text-xs text-center tracking-widest uppercase">Choose a game</p>
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
          </>
        )}

        {mode === 'bot' && (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-white/30 text-xs text-center tracking-widest uppercase">Difficulty</p>
              <div className="flex justify-center gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={diffBtnClass(d)}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-white/20 text-xs text-center mt-1">
                {difficulty === 'easy' ? 'Bot makes fewer baskets / misses more rings' :
                 difficulty === 'medium' ? 'Fair challenge — adapts to your skill' :
                 'Bot plays near-perfect — good luck'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => playBot('basketball')}
                className="flex flex-col items-center gap-2 bg-orange-600/20 hover:bg-orange-600/35 border border-orange-500/30 rounded-2xl px-4 py-5 transition-colors"
              >
                <span className="text-3xl">🏀</span>
                <span className="text-white font-semibold text-sm">Basketball</span>
                <span className="text-white/40 text-xs">30s · swipe to shoot</span>
              </button>
              <button
                onClick={() => playBot('archery')}
                className="flex flex-col items-center gap-2 bg-green-700/20 hover:bg-green-700/35 border border-green-500/30 rounded-2xl px-4 py-5 transition-colors"
              >
                <span className="text-3xl">🏹</span>
                <span className="text-white font-semibold text-sm">Archery</span>
                <span className="text-white/40 text-xs">3 arrows · wind drift</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
