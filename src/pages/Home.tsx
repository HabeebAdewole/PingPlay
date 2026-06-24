import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export default function Home() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function createRoom() {
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch(`${SERVER_URL}/room/create`, { method: 'POST' })
    const { roomId } = await res.json()
    sessionStorage.setItem('playerName', name.trim())
    navigate(`/room/${roomId}`)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold mb-2">PingPlay</h1>
      <p className="text-gray-400 mb-10">Challenge your friends to mini-games</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          maxLength={20}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={createRoom}
          disabled={!name.trim() || loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-4 py-3 font-semibold transition-colors"
        >
          {loading ? 'Creating room...' : 'Create Room'}
        </button>
      </div>
    </div>
  )
}
