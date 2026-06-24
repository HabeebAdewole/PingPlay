import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { BasketballScene } from '../scenes/BasketballScene'

interface PhaserGameProps {
  onScore: (total: number) => void
  onSetEnd: (setScore: number, set: number) => void
}

export default function PhaserGame({ onScore, onSetEnd }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#1a1a2e',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 900 }, debug: false },
      },
      scene: [BasketballScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    game.events.on('score_update', onScore)
    game.events.on('set_end', onSetEnd)
    gameRef.current = game

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
