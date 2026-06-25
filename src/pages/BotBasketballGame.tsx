import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import type Phaser from 'phaser'
import PhaserGame from '../components/PhaserGame'
import GameHUD from '../components/GameHUD'
import { BasketballScene } from '../scenes/BasketballScene'
import { initAudio } from '../utils/audio'

const SET_DURATION = 30

type Phase = 'playing' | 'bot_thinking' | 'done'

async function fetchBotScore(playerScore: number, difficulty: string): Promise<number> {
  const res = await fetch('/api/bot/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'basketball', difficulty, player_score: playerScore }),
  })
  const data = await res.json()
  return data.bot_score as number
}

export default function BotBasketballGame() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const difficulty = searchParams.get('difficulty') || 'medium'

  const gameRef = useRef<Phaser.Game | null>(null)
  const scoreRef = useRef(0)

  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SET_DURATION)
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const [phase, setPhase] = useState<Phase>('playing')
  const [botScore, setBotScore] = useState<number | null>(null)

  const handleGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
    initAudio()
  }, [])

  const handleBasket = useCallback(() => {
    scoreRef.current += 1
    setScore(scoreRef.current)
    setShowSwipeHint(false)
  }, [])

  // Hide swipe hint after 3s
  useEffect(() => {
    const t = setTimeout(() => setShowSwipeHint(false), 3000)
    return () => clearTimeout(t)
  }, [])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        const next = t <= 1 ? 0 : t - 1
        const scene = gameRef.current?.scene.getScene('BasketballScene') as BasketballScene | undefined
        scene?.onTimerTick(next)
        if (next === 0) {
          clearInterval(interval)
          endGame()
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  function endGame() {
    const scene = gameRef.current?.scene.getScene('BasketballScene') as BasketballScene | undefined
    scene?.disableInput()
    setPhase('bot_thinking')

    fetchBotScore(scoreRef.current, difficulty)
      .then((bs) => {
        setBotScore(bs)
        setPhase('done')
        // Adaptive: save next difficulty to sessionStorage
        const next = bs > scoreRef.current
          ? difficulty === 'easy' ? 'easy' : difficulty === 'medium' ? 'easy' : 'medium'
          : scoreRef.current > bs * 1.25
          ? difficulty === 'easy' ? 'medium' : difficulty === 'medium' ? 'hard' : 'hard'
          : difficulty
        sessionStorage.setItem('botDifficulty', next)
      })
      .catch(() => { setBotScore(Math.floor(Math.random() * 12)); setPhase('done') })
  }

  if (phase === 'bot_thinking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white"
        style={{ background: 'linear-gradient(to bottom, #0a1628, #0d1f3c)' }}>
        <p className="text-white/40 text-xs tracking-[5px] uppercase mb-4">Your score</p>
        <p className="text-white text-8xl font-black mb-8">{score}</p>
        <p className="text-white/60 text-sm mb-4">Bot is shooting...</p>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'done' && botScore !== null) {
    const iWin = score > botScore
    const tie = score === botScore
    const diffLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[difficulty] ?? difficulty
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-white"
        style={{ background: 'linear-gradient(to bottom, #0a1628, #0d1f3c)' }}>
        <p className="text-white/40 text-xs tracking-[5px] uppercase mb-3">Game Over</p>
        <h2 className="text-5xl font-black mb-1">
          {tie ? "It's a Tie" : iWin ? 'You Win 🏆' : 'Bot Wins 🤖'}
        </h2>
        <p className="text-white/50 text-lg mb-8">{score} — {botScore}</p>
        <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/40">You</span>
            <span className="text-white font-bold text-lg">{score}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Bot ({diffLabel})</span>
            <span className="text-white font-bold text-lg">{botScore}</span>
          </div>
        </div>
        <p className="text-white/30 text-xs mb-8">
          {iWin ? 'Bot difficulty will increase next game' : !tie ? 'Bot difficulty will decrease next game' : ''}
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/play/basketball?difficulty=' + (sessionStorage.getItem('botDifficulty') || difficulty))}
            className="bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-2xl px-6 py-3 transition-colors">
            Play Again
          </button>
          <button onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl px-6 py-3 transition-colors">
            Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative"
      style={{ background: 'linear-gradient(to bottom, #0a1628 0%, #0d1f3c 75%, #0a1a30 100%)' }}>

      {/* Difficulty badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <span className="text-white/30 text-[10px] tracking-[4px] uppercase">vs Bot · {difficulty}</span>
      </div>

      {/* Wood floor */}
      <div className="absolute bottom-0 left-0 right-0 h-[18%] rounded-t-[2px]"
        style={{ background: 'linear-gradient(to bottom, #c97f30, #9a5e1a)' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-black/10"
            style={{ top: `${(i + 1) * 18}%` }} />
        ))}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-200/40" />
        <div className="absolute -top-[110px] left-1/2 -translate-x-1/2 w-[80vw] h-[140px] rounded-t-full border-2 border-amber-200/15 border-b-0" />
      </div>

      <div className="absolute inset-0">
        <PhaserGame onBasket={handleBasket} onGameReady={handleGameReady} />
      </div>

      <GameHUD
        score={score}
        timeLeft={timeLeft}
        currentSet={1}
        totalSets={1}
        showSwipeHint={showSwipeHint}
      />
    </div>
  )
}
