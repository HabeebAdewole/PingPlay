import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../socket'

interface Player {
  id: string
  name: string
  ready?: boolean
}

interface Room {
  players: Player[]
  status: 'waiting' | 'ready' | 'playing'
}

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [error, setError] = useState('')
  const [isReady, setIsReady] = useState(false)

  const appUrl = window.location.origin
  const roomLink = `${appUrl}/room/${roomId}`
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`I challenged you to a game on PingPlay! Join here: ${roomLink}`)}`

  useEffect(() => {
    const saved = sessionStorage.getItem('playerName')
    if (saved) {
      setPlayerName(saved)
      joinRoom(saved)
    }
  }, [])

  function joinRoom(name: string) {
    socket.connect()
    socket.emit('join_room', { roomId, playerName: name })
  }

  function handleNameSubmit() {
    if (!nameInput.trim()) return
    const name = nameInput.trim()
    sessionStorage.setItem('playerName', name)
    setPlayerName(name)
    joinRoom(name)
  }

  function handleReady() {
    socket.emit('player_ready')
    setIsReady(true)
  }

  useEffect(() => {
    socket.on('room_update', (updatedRoom: Room & { gameType?: string }) => {
      setRoom(updatedRoom)
      if (updatedRoom.status === 'playing') {
        const gameType = updatedRoom.gameType || sessionStorage.getItem('gameType') || 'basketball'
        const dest = gameType === 'archery' ? `/room/${roomId}/archery` : `/room/${roomId}/game`
        navigate(dest)
      }
    })

    socket.on('error', ({ message }: { message: string }) => {
      setError(message)
    })

    return () => {
      socket.off('room_update')
      socket.off('error')
    }
  }, [roomId, navigate])

  if (!playerName) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-3xl font-bold mb-2">You've been challenged!</h1>
        <p className="text-gray-400 mb-8">Enter your name to join the room</p>
        <div className="w-full max-w-sm flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            maxLength={20}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleNameSubmit}
            disabled={!nameInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl px-4 py-3 font-semibold transition-colors"
          >
            Join Room
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="text-indigo-400 underline">
          Go home
        </button>
      </div>
    )
  }

  const me = room?.players.find((p) => p.id === socket.id)
  const opponent = room?.players.find((p) => p.id !== socket.id)
  const bothConnected = (room?.players.length ?? 0) >= 2

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-gray-500 text-sm text-center mb-1">Room</p>
        <h2 className="text-4xl font-bold text-center tracking-widest mb-8">{roomId}</h2>

        {/* Players */}
        <div className="flex flex-col gap-3 mb-8">
          <PlayerSlot label="You" name={me?.name ?? playerName} ready={me?.ready} filled />
          <PlayerSlot label="Opponent" name={opponent?.name} ready={opponent?.ready} filled={!!opponent} />
        </div>

        {/* Waiting / invite */}
        {!bothConnected && (
          <div className="flex flex-col gap-3 mb-6">
            <p className="text-gray-400 text-center text-sm">Waiting for opponent to join...</p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 rounded-xl px-4 py-3 font-semibold transition-colors"
            >
              <WhatsAppIcon />
              Invite via WhatsApp
            </a>
          </div>
        )}

        {/* Ready button */}
        {bothConnected && (
          <button
            onClick={handleReady}
            disabled={isReady}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-4 py-3 font-semibold transition-colors"
          >
            {isReady ? 'Waiting for opponent...' : "I'm Ready!"}
          </button>
        )}
      </div>
    </div>
  )
}

function PlayerSlot({ label, name, ready, filled }: { label: string; name?: string; ready?: boolean; filled: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${filled ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 border-dashed'}`}>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`font-semibold ${filled ? 'text-white' : 'text-gray-600'}`}>
          {filled ? name : 'Waiting...'}
        </p>
      </div>
      {filled && (
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ready ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
          {ready ? 'Ready' : 'Not ready'}
        </span>
      )}
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
