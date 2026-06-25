import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { ArcheryScene } from '../scenes/ArcheryScene'

interface Props {
  onScore: (data: { pts: number; total: number; arrowsLeft: number }) => void
  onWind: (data: { wx: number; wy: number; strength: number }) => void
  onDone: (data: { total: number }) => void
  onGameReady: (game: Phaser.Game) => void
}

export default function ArcheryPhaserGame({ onScore, onWind, onDone, onGameReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [ArcheryScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    })

    game.events.on('archery_score', onScore)
    game.events.on('archery_wind', onWind)
    game.events.once('archery_done', onDone)
    game.events.once('ready', () => onGameReady(game))

    gameRef.current = game
    return () => { game.destroy(true); gameRef.current = null }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
