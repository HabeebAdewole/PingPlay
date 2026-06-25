import { useState, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { saveScore } from '../lib/saveScore'
import type Phaser from 'phaser'
import ArcheryPhaserGame from '../components/ArcheryPhaserGame'
import ArcheryHUD from '../components/ArcheryHUD'
import { initAudio } from '../utils/audio'

const TOTAL_ARROWS = 3

interface WindData { wx: number; wy: number; strength: number }

async function fetchBotScore(playerScore: number, difficulty: string): Promise<{ bot_score: number; breakdown: number[] }> {
  const res = await fetch('/api/bot/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'archery', difficulty, player_score: playerScore }),
  })
  return res.json()
}

export default function BotArcheryGame() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const difficulty = searchParams.get('difficulty') || 'medium'

  const gameRef = useRef<Phaser.Game | null>(null)
  const scoreRef = useRef(0)
  const lastPtsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [score, setScore] = useState(0)
  const [arrowsLeft, setArrowsLeft] = useState(TOTAL_ARROWS)
  const [wind, setWind] = useState<WindData | null>(null)
  const [lastPts, setLastPts] = useState<number | null>(null)
  const [hudPhase, setHudPhase] = useState<'aiming' | 'flying' | 'waiting' | 'done'>('aiming')
  const [botResult, setBotResult] = useState<{ score: number; breakdown: number[] } | null>(null)

  const handleGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
    initAudio()
  }, [])

  const handleScore = useCallback(({ pts, total, arrowsLeft: left }: { pts: number; total: number; arrowsLeft: number }) => {
    scoreRef.current = total
    setScore(total)
    setArrowsLeft(left)
    setLastPts(pts)
    if (lastPtsTimer.current) clearTimeout(lastPtsTimer.current)
    lastPtsTimer.current = setTimeout(() => setLastPts(null), 1200)
  }, [])

  const handleWind = useCallback((data: WindData) => {
    setWind(data)
    setHudPhase('aiming')
  }, [])

  const handleDone = useCallback(({ total }: { total: number }) => {
    setHudPhase('waiting')
    fetchBotScore(total, difficulty)
      .then(({ bot_score, breakdown }) => {
        setBotResult({ score: bot_score, breakdown })
        setHudPhase('done')
        const playerName = sessionStorage.getItem('playerName') || 'Player'
        saveScore({ player_name: playerName, game_type: 'archery', score: total, mode: 'bot' })
        const next = bot_score > total
          ? difficulty === 'easy' ? 'easy' : difficulty === 'medium' ? 'easy' : 'medium'
          : total > bot_score * 1.25
          ? difficulty === 'easy' ? 'medium' : difficulty === 'medium' ? 'hard' : 'hard'
          : difficulty
        sessionStorage.setItem('botDifficulty', next)
      })
      .catch(() => { setBotResult({ score: Math.floor(Math.random() * 20), breakdown: [] }); setHudPhase('done') })
  }, [difficulty])

  if (hudPhase === 'done' && botResult) {
    const mine = score
    const theirs = botResult.score
    const iWin = mine > theirs
    const tie = mine === theirs
    const diffLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[difficulty] ?? difficulty
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-white"
        style={{ background: 'linear-gradient(to bottom, #1a3a1a, #0d2010)' }}>
        <p className="text-white/40 text-xs tracking-[5px] uppercase mb-3">Game Over</p>
        <h2 className="text-5xl font-black mb-1">
          {tie ? "It's a Tie" : iWin ? 'You Win 🏆' : 'Bot Wins 🤖'}
        </h2>
        <p className="text-white/50 text-lg mb-8">{mine} — {theirs}</p>
        <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/40">You</span>
            <span className="text-white font-bold text-lg">{mine} / 30</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Bot ({diffLabel})</span>
            <span className="text-white font-bold text-lg">{theirs} / 30</span>
          </div>
          {botResult.breakdown.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-xs text-white/40">
              <span>Bot arrows:</span>
              <span>{botResult.breakdown.join(' · ')} pts</span>
            </div>
          )}
        </div>
        <p className="text-white/30 text-xs mb-8">
          {iWin ? 'Bot difficulty will increase next game' : !tie ? 'Bot difficulty will decrease next game' : ''}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => navigate('/play/archery?difficulty=' + (sessionStorage.getItem('botDifficulty') || difficulty))}
            className="bg-green-700 hover:bg-green-600 text-white font-semibold rounded-2xl px-5 py-3 transition-colors">
            Play Again
          </button>
          <button onClick={() => navigate('/leaderboard')}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl px-5 py-3 transition-colors">
            Leaderboard
          </button>
          <button onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl px-5 py-3 transition-colors">
            Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative"
      style={{ background: 'linear-gradient(to bottom, #87ceeb 0%, #b8dff0 38%, #5a9e44 60%, #3d7a2e 100%)' }}>

      {/* Difficulty badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="text-white/50 text-[10px] tracking-[4px] uppercase drop-shadow">vs Bot · {difficulty}</span>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '40%', width: '6px', height: '35%', background: 'linear-gradient(to bottom, #8B4513, #5C3317)', borderRadius: '3px' }} />
      <div className="absolute bottom-0 left-0 right-0 h-[18%]"
        style={{ background: 'linear-gradient(to bottom, #5a9e44, #3d7a2e)' }}>
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-green-200/20" />
      </div>

      <div className="absolute inset-0">
        <ArcheryPhaserGame
          onScore={handleScore}
          onWind={handleWind}
          onDone={handleDone}
          onGameReady={handleGameReady}
        />
      </div>

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
