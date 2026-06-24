import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PhaserGame from '../components/PhaserGame'
import { socket } from '../socket'

interface SetScore {
  set: number
  mine: number
  theirs: number | null
}

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [setScores, setSetScores] = useState<SetScore[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [finalMine, setFinalMine] = useState(0)
  const [finalTheirs, setFinalTheirs] = useState<number | null>(null)

  const handleScore = useCallback((_total: number) => {
    // live score handled inside Phaser HUD
  }, [])

  const handleSetEnd = useCallback((setScore: number, set: number) => {
    socket.emit('set_score', { roomId, set, score: setScore })

    setSetScores((prev) => [...prev, { set, mine: setScore, theirs: null }])
    setFinalMine(setScore)

    socket.once('opponent_set_score', ({ set: oppSet, score: oppScore }: { set: number; score: number }) => {
      setSetScores((prev) =>
        prev.map((s) => s.set === oppSet ? { ...s, theirs: oppScore } : s)
      )
      if (oppSet === 2) {
        setFinalTheirs(oppScore)
        setGameOver(true)
      }
    })
  }, [roomId])

  if (gameOver) {
    const iWin = finalMine > (finalTheirs ?? 0)
    const tie = finalMine === finalTheirs
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
        <h2 className="text-4xl font-bold mb-2">
          {tie ? "It's a Tie!" : iWin ? 'You Win! 🏆' : 'You Lose 😔'}
        </h2>
        <p className="text-gray-400 mb-8">
          {finalMine} — {finalTheirs}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs mb-10">
          {setScores.map((s) => (
            <div key={s.set} className="flex justify-between bg-gray-800 rounded-xl px-4 py-3">
              <span className="text-gray-400">Set {s.set}</span>
              <span className="font-semibold">{s.mine} — {s.theirs ?? '...'}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-6 py-3 font-semibold transition-colors"
        >
          Play Again
        </button>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <PhaserGame onScore={handleScore} onSetEnd={handleSetEnd} />
    </div>
  )
}
