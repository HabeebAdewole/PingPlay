import { useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type Phaser from 'phaser'
import ArcheryPhaserGame from '../components/ArcheryPhaserGame'
import ArcheryHUD from '../components/ArcheryHUD'
import { socket } from '../socket'
import { initAudio } from '../utils/audio'

const TOTAL_ARROWS = 3

interface WindData { wx: number; wy: number; strength: number }

export default function ArcheryGame() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const gameRef = useRef<Phaser.Game | null>(null)

  const [score, setScore] = useState(0)
  const [arrowsLeft, setArrowsLeft] = useState(TOTAL_ARROWS)
  const [wind, setWind] = useState<WindData | null>(null)
  const [lastPts, setLastPts] = useState<number | null>(null)
  const [hudPhase, setHudPhase] = useState<'aiming' | 'flying' | 'waiting' | 'done'>('aiming')
  const [gameOver, setGameOver] = useState(false)
  const [finalMine, setFinalMine] = useState(0)
  const [finalTheirs, setFinalTheirs] = useState<number | null>(null)

  const scoreRef = useRef(0)
  const lastPtsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
    initAudio()
  }, [])

  const handleScore = useCallback(({ pts, total, arrowsLeft: left }: { pts: number; total: number; arrowsLeft: number }) => {
    scoreRef.current = total
    setScore(total)
    setArrowsLeft(left)
    setLastPts(pts)
    setHudPhase(left > 0 ? 'aiming' : 'aiming')

    if (lastPtsTimer.current) clearTimeout(lastPtsTimer.current)
    lastPtsTimer.current = setTimeout(() => setLastPts(null), 1200)
  }, [])

  const handleWind = useCallback((data: WindData) => {
    setWind(data)
    setHudPhase('aiming')
  }, [])

  const handleDone = useCallback(({ total }: { total: number }) => {
    setFinalMine(total)
    setHudPhase('waiting')

    socket.emit('set_score', { roomId, set: 1, score: total })

    socket.once('opponent_set_score', ({ score: oppScore }: { score: number }) => {
      setFinalTheirs(oppScore)
      setGameOver(true)
      setHudPhase('done')
    })
  }, [roomId])

  const handleScoreInFlight = useCallback(() => {
    setHudPhase('flying')
  }, [])

  // Override: set flying phase on score event before aiming resets
  // (ArcheryScene emits archery_score when arrow lands, so we detect flying by arrowsLeft change)

  if (gameOver && finalTheirs !== null) {
    const iWin = finalMine > finalTheirs
    const tie = finalMine === finalTheirs
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-white"
        style={{ background: 'linear-gradient(to bottom, #1a3a1a, #0d2010)' }}>
        <p className="text-white/40 text-xs tracking-[5px] uppercase mb-3">Game Over</p>
        <h2 className="text-5xl font-black mb-1">
          {tie ? "It's a Tie" : iWin ? 'You Win 🏆' : 'You Lose'}
        </h2>
        <p className="text-white/50 text-lg mb-10">{finalMine} — {finalTheirs}</p>
        <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-10">
          <div className="flex justify-between items-center">
            <span className="text-white/40 text-sm uppercase tracking-widest">Archery</span>
            <span className="text-white font-bold text-lg">{finalMine} — {finalTheirs}</span>
          </div>
          <div className="mt-3 flex justify-between text-sm text-white/30">
            <span>{TOTAL_ARROWS} arrows each</span>
            <span>Max {TOTAL_ARROWS * 10} pts</span>
          </div>
        </div>
        <button onClick={() => navigate('/')}
          className="bg-green-700 hover:bg-green-600 text-white font-semibold rounded-2xl px-8 py-4 transition-colors">
          Play Again
        </button>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative"
      style={{ background: 'linear-gradient(to bottom, #87ceeb 0%, #b8dff0 38%, #5a9e44 60%, #3d7a2e 100%)' }}>

      {/* Target stand */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '40%', width: '6px', height: '35%', background: 'linear-gradient(to bottom, #8B4513, #5C3317)', borderRadius: '3px' }} />

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-[18%]"
        style={{ background: 'linear-gradient(to bottom, #5a9e44, #3d7a2e)' }}>
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-green-200/20" />
      </div>

      {/* Phaser canvas */}
      <div className="absolute inset-0">
        <ArcheryPhaserGame
          onScore={handleScore}
          onWind={handleWind}
          onDone={handleDone}
          onGameReady={handleGameReady}
        />
      </div>

      {/* HUD */}
      <ArcheryHUD
        score={score}
        arrowsLeft={arrowsLeft}
        totalArrows={TOTAL_ARROWS}
        wind={wind}
        lastPts={lastPts}
        phase={hudPhase}
      />
    </div>
  )
}
