import { useEffect, useRef } from 'react'

interface Props {
  score: number
  timeLeft: number
  currentSet: number
  totalSets: number
  showSwipeHint: boolean
}

export default function GameHUD({ score, timeLeft, currentSet, totalSets, showSwipeHint }: Props) {
  const timerBarRef = useRef<HTMLDivElement>(null)
  const SET_DURATION = 30

  useEffect(() => {
    if (timerBarRef.current) {
      timerBarRef.current.style.width = `${(timeLeft / SET_DURATION) * 100}%`
    }
  }, [timeLeft])

  const urgent = timeLeft <= 5

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 px-5 pt-10 pb-4 flex items-start justify-between">
        {/* Score */}
        <div className="flex flex-col">
          <span className="text-white/40 text-[10px] font-semibold tracking-[4px] uppercase">Score</span>
          <span className="text-white text-6xl font-black leading-none tabular-nums">{score}</span>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <span className="text-white/40 text-[10px] font-semibold tracking-[4px] uppercase mb-1">Time</span>
          <span className={`text-5xl font-black leading-none tabular-nums transition-colors duration-300 ${urgent ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}
          </span>
          {urgent && (
            <span className="text-red-400/60 text-[10px] tracking-widest uppercase animate-pulse">hurry!</span>
          )}
        </div>

        {/* Set */}
        <div className="flex flex-col items-end">
          <span className="text-white/40 text-[10px] font-semibold tracking-[4px] uppercase">Set</span>
          <span className="text-white text-2xl font-black leading-none">
            {currentSet}<span className="text-white/30 text-base font-medium">/{totalSets}</span>
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div
          ref={timerBarRef}
          className={`h-full transition-all duration-1000 ease-linear rounded-r-full ${urgent ? 'bg-red-400' : 'bg-indigo-400'}`}
          style={{ width: `${(timeLeft / SET_DURATION) * 100}%` }}
        />
      </div>

      {/* Swipe hint */}
      {showSwipeHint && (
        <div className="absolute bottom-[28%] left-0 right-0 flex flex-col items-center gap-1 animate-bounce">
          <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className="text-white/40 text-xs tracking-widest uppercase">swipe up to shoot</span>
        </div>
      )}
    </div>
  )
}
