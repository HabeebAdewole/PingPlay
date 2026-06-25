interface WindData {
  wx: number
  wy: number
  strength: number
}

interface Props {
  score: number
  arrowsLeft: number
  totalArrows: number
  wind: WindData | null
  lastPts: number | null
  phase: 'aiming' | 'flying' | 'waiting' | 'done'
}

function windLabel(s: number) {
  if (s < 0.15) return 'Calm'
  if (s < 0.35) return 'Light'
  if (s < 0.6)  return 'Moderate'
  if (s < 0.8)  return 'Strong'
  return 'Gale'
}

export default function ArcheryHUD({ score, arrowsLeft, totalArrows, wind, lastPts, phase }: Props) {
  const windAngle = wind ? Math.atan2(wind.wy, wind.wx) * (180 / Math.PI) : 0
  const shotsFired = totalArrows - arrowsLeft

  return (
    <div className="absolute inset-0 pointer-events-none select-none">

      {/* Top bar */}
      <div className="absolute top-4 left-0 right-0 flex items-start justify-between px-5">

        {/* Score */}
        <div className="flex flex-col">
          <span className="text-white/40 text-[10px] tracking-[4px] uppercase">Score</span>
          <span className="text-white text-4xl font-black leading-none">{score}</span>
        </div>

        {/* Wind indicator */}
        {wind && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-[10px] tracking-[4px] uppercase">Wind</span>
            <div className="relative w-11 h-11">
              <svg viewBox="0 0 44 44" className="w-full h-full">
                <circle cx="22" cy="22" r="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <text x="22" y="7"  textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6">N</text>
                <text x="22" y="41" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6">S</text>
                <text x="5"  y="25" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6">W</text>
                <text x="39" y="25" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6">E</text>
                <g transform={`rotate(${windAngle + 90}, 22, 22)`}>
                  <line x1="22" y1="30" x2="22" y2="14" stroke="#ff8800" strokeWidth="2" strokeLinecap="round" />
                  <polygon points="22,9 18.5,16 25.5,16" fill="#ff8800" />
                </g>
              </svg>
            </div>
            <span className="text-orange-400 text-[10px] font-semibold tracking-wide">
              {windLabel(wind.strength)}
            </span>
          </div>
        )}

        {/* Arrows remaining */}
        <div className="flex flex-col items-end">
          <span className="text-white/40 text-[10px] tracking-[4px] uppercase mb-1">Arrows</span>
          <div className="flex gap-1">
            {Array.from({ length: totalArrows }).map((_, i) => (
              <span key={i} className={`text-xl leading-none ${i < arrowsLeft ? 'opacity-100' : 'opacity-20'}`}>
                🏹
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Arrow hit dots (shots fired counter) */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: totalArrows }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < shotsFired ? 'bg-green-400' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Score flash */}
      {lastPts !== null && lastPts > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className={`text-5xl font-black drop-shadow-lg ${lastPts === 10 ? 'text-yellow-400' : lastPts >= 8 ? 'text-red-400' : 'text-white'}`}>
            +{lastPts}
          </span>
          {lastPts === 10 && (
            <div className="text-center text-yellow-300 text-sm font-bold mt-1">BULLSEYE!</div>
          )}
        </div>
      )}

      {/* Bottom hint */}
      {phase === 'aiming' && (
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 opacity-60">
            <div className="w-8 h-px bg-white/40" />
            <span className="text-white/60 text-xs tracking-widest uppercase">Drag to aim · Release to shoot</span>
            <div className="w-8 h-px bg-white/40" />
          </div>
          <p className="text-orange-400/60 text-[10px]">Orange ring shows wind drift</p>
        </div>
      )}

      {phase === 'flying' && (
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="text-white/40 text-xs tracking-widest uppercase">Arrow in flight...</span>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: 'rgba(10,22,40,0.88)', backdropFilter: 'blur(8px)' }}>
          <p className="text-white/40 text-xs tracking-[5px] uppercase mb-3">Your score</p>
          <p className="text-white text-8xl font-black mb-2">{score}</p>
          <p className="text-white/30 text-sm">Waiting for opponent...</p>
          <div className="mt-6 flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
