import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { BasketballScene } from '../scenes/BasketballScene'

interface PhaserGameProps {
  onBasket: () => void
  onGameReady: (game: Phaser.Game) => void
}

export default function PhaserGame({ onBasket, onGameReady }: PhaserGameProps) {
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
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 950 }, debug: false },
      },
      scene: [BasketballScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    game.events.on('basket', onBasket)
    gameRef.current = game

    // Wait for scene to be ready before notifying parent
    game.events.once('ready', () => onGameReady(game))

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
