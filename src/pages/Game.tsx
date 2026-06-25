import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type Phaser from 'phaser'
import PhaserGame from '../components/PhaserGame'
import GameHUD from '../components/GameHUD'
import { socket } from '../socket'
import { BasketballScene } from '../scenes/BasketballScene'
import { initAudio } from '../utils/audio'
import { saveScore } from '../lib/saveScore'

const SETS = 2
const SET_DURATION = 30

interface SetScore { set: number; mine: number; theirs: number | null }

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const gameRef = useRef<Phaser.Game | null>(null)

  const handleGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
  }, [])

  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SET_DURATION)
  const [currentSet, setCurrentSet] = useState(1)
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const [phase, setPhase] = useState<'playing' | 'set_break' | 'done'>('playing')
  const [setBreakCountdown, setSetBreakCountdown] = useState(3)
  const [setScores, setSetScores] = useState<SetScore[]>([])
  const [mySetScore, setMySetScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [finalMine, setFinalMine] = useState(0)
  const [finalTheirs, setFinalTheirs] = useState<number | null>(null)

  const scoreRef = useRef(0)
  const currentSetRef = useRef(1)

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        const next = t <= 1 ? 0 : t - 1
        // Forward tick to Phaser scene for beeps
        const scene = gameRef.current?.scene.getScene('BasketballScene') as BasketballScene | undefined
        scene?.onTimerTick(next)
        if (next === 0) { clearInterval(interval); endSet() }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, currentSet])

  // Hide swipe hint after 3s
  useEffect(() => {
    const t = setTimeout(() => setShowSwipeHint(false), 3000)
    return () => clearTimeout(t)
  }, [])

  // Unlock AudioContext on first touch
  useEffect(() => {
    const unlock = () => { initAudio(); window.removeEventListener('pointerdown', unlock) }
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const handleBasket = useCallback(() => {
    scoreRef.current += 1
    setScore(scoreRef.current)
    setShowSwipeHint(false)
  }, [])

  function endSet() {
    const scene = gameRef.current?.scene.getScene('BasketballScene') as BasketballScene | undefined
    scene?.disableInput()

    const setScore = scoreRef.current
    setMySetScore(setScore)
    socket.emit('set_score', { roomId, set: currentSetRef.current, score: setScore })

    setSetScores((prev) => [...prev, { set: currentSetRef.current, mine: setScore, theirs: null }])

    socket.once('opponent_set_score', ({ set: oppSet, score: oppScore }: { set: number; score: number }) => {
      setSetScores((prev) => prev.map((s) => s.set === oppSet ? { ...s, theirs: oppScore } : s))
      if (oppSet === SETS) {
        const myFinal = scoreRef.current
        setFinalMine(myFinal)
        setFinalTheirs(oppScore)
        setGameOver(true)
        setPhase('done')
        const playerName = sessionStorage.getItem('playerName') || 'Anonymous'
        saveScore({ player_name: playerName, game_type: 'basketball', score: myFinal, mode: 'multiplayer' })
      }
    })

    if (currentSetRef.current < SETS) {
      setPhase('set_break')
      let count = 3
      setSetBreakCountdown(count)
      const cd = setInterval(() => {
        count--
        setSetBreakCountdown(count)
        if (count <= 0) {
          clearInterval(cd)
          startNextSet()
        }
      }, 1000)
    } else {
      setPhase('done')
    }
  }

  function startNextSet() {
    if (currentSetRef.current >= SETS) return
    currentSetRef.current += 1
    scoreRef.current = 0
    setScore(0)
    setCurrentSet(currentSetRef.current)
    setTimeLeft(SET_DURATION)
    setPhase('playing')
    const scene = gameRef.current?.scene.getScene('BasketballScene') as BasketballScene | undefined
    scene?.enableInput()
  }

  if (gameOver && finalTheirs !== null) {
    const iWin = finalMine > finalTheirs
    const tie = finalMine === finalTheirs
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-white"
        style={{ background: 'linear-gradient(to bottom, #0a1628, #0d1f3c)' }}>
        <p className="text-white/40 text-xs tracking-[5px] uppercase mb-3">Game Over</p>
        <h2 className="text-5xl font-black mb-1">
          {tie ? "It's a Tie" : iWin ? 'You Win 🏆' : 'You Lose'}
        </h2>
        <p className="text-white/50 text-lg mb-10">{finalMine} — {finalTheirs}</p>
        <div className="w-full max-w-xs flex flex-col gap-3 mb-10">
          {setScores.map((s) => (
            <div key={s.set} className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
              <span className="text-white/40 text-sm uppercase tracking-widest">Set {s.set}</span>
              <span className="text-white font-bold text-lg">{s.mine} — {s.theirs ?? '...'}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl px-6 py-4 transition-colors">
            Play Again
          </button>
          <button onClick={() => navigate('/leaderboard')}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl px-6 py-4 transition-colors">
            Leaderboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative"
      style={{ background: 'linear-gradient(to bottom, #0a1628 0%, #0d1f3c 75%, #0a1a30 100%)' }}>

      {/* Wood floor */}
      <div className="absolute bottom-0 left-0 right-0 h-[18%] rounded-t-[2px]"
        style={{ background: 'linear-gradient(to bottom, #c97f30, #9a5e1a)' }}>
        {/* Planks */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-black/10"
            style={{ top: `${(i + 1) * 18}%` }} />
        ))}
        {/* Court line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-200/40" />
        {/* Three-point semicircle */}
        <div className="absolute -top-[110px] left-1/2 -translate-x-1/2 w-[80vw] h-[140px] rounded-t-full border-2 border-amber-200/15 border-b-0" />
      </div>

      {/* Phaser canvas (transparent, just ball + physics) */}
      <div className="absolute inset-0">
        <PhaserGame onBasket={handleBasket} onGameReady={handleGameReady} />
      </div>

      {/* React HUD overlay */}
      <GameHUD
        score={score}
        timeLeft={timeLeft}
        currentSet={currentSet}
        totalSets={SETS}
        showSwipeHint={showSwipeHint}
      />

      {/* Set break overlay */}
      {phase === 'set_break' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: 'rgba(10,22,40,0.88)', backdropFilter: 'blur(8px)' }}>
          <p className="text-white/40 text-xs tracking-[5px] uppercase mb-2">Set {currentSet} Complete</p>
          <p className="text-white text-8xl font-black mb-1">{mySetScore}</p>
          <p className="text-white/30 text-sm mb-10">your score</p>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${setBreakCountdown <= 2 ? 'bg-indigo-400' : 'bg-white/20'}`} />
            <div className={`w-3 h-3 rounded-full ${setBreakCountdown <= 1 ? 'bg-indigo-400' : 'bg-white/20'}`} />
            <div className={`w-3 h-3 rounded-full ${setBreakCountdown <= 0 ? 'bg-indigo-400' : 'bg-white/20'}`} />
          </div>
          <p className="text-white/30 text-sm mt-3">Set 2 starting in {setBreakCountdown}...</p>
        </div>
      )}
    </div>
  )
}
