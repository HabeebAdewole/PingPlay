import Phaser from 'phaser'
import { playSwish, playBounce } from '../utils/audio'

export class ArcheryScene extends Phaser.Scene {
  private targetX = 0
  private targetY = 0
  private targetRadius = 110

  private targetGfx!: Phaser.GameObjects.Graphics
  private crosshairGfx!: Phaser.GameObjects.Graphics
  private arrowGfx!: Phaser.GameObjects.Graphics
  private markerGfx!: Phaser.GameObjects.Graphics

  private crosshairX = 0
  private crosshairY = 0

  private arrowsLeft = 3
  private totalScore = 0
  private phase: 'aiming' | 'flying' | 'done' = 'aiming'

  windX = 0
  windY = 0

  private isDragging = false
  private dragStartPtr = { x: 0, y: 0 }
  private crosshairAtDragStart = { x: 0, y: 0 }

  constructor() {
    super('ArcheryScene')
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height

    this.targetX = W / 2
    this.targetY = H * 0.40
    this.targetRadius = Math.min(W * 0.30, H * 0.32, 120)

    this.crosshairX = this.targetX
    this.crosshairY = this.targetY

    this.targetGfx = this.add.graphics()
    this.drawTarget()

    this.markerGfx = this.add.graphics()
    this.arrowGfx = this.add.graphics()
    this.crosshairGfx = this.add.graphics()
    this.drawCrosshair()

    this.generateWind()

    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
  }

  private drawTarget() {
    const s = this.targetRadius / 90
    const rings = [
      { r: 90, color: 0xe8e8e8 },
      { r: 72, color: 0xcccccc },
      { r: 54, color: 0x1a6aff },
      { r: 36, color: 0xee2222 },
      { r: 18, color: 0xffcc00 },
    ]
    for (const ring of rings) {
      this.targetGfx.fillStyle(ring.color, 1)
      this.targetGfx.fillCircle(this.targetX, this.targetY, ring.r * s)
      this.targetGfx.lineStyle(1, 0x00000033)
      this.targetGfx.strokeCircle(this.targetX, this.targetY, ring.r * s)
    }
    // Cross lines on target
    this.targetGfx.lineStyle(1, 0x00000022)
    this.targetGfx.lineBetween(this.targetX - this.targetRadius, this.targetY, this.targetX + this.targetRadius, this.targetY)
    this.targetGfx.lineBetween(this.targetX, this.targetY - this.targetRadius, this.targetX, this.targetY + this.targetRadius)
    // Centre dot
    this.targetGfx.fillStyle(0xffcc00, 1)
    this.targetGfx.fillCircle(this.targetX, this.targetY, 4 * s)
  }

  private drawCrosshair() {
    this.crosshairGfx.clear()
    if (this.phase !== 'aiming') return

    const x = this.crosshairX
    const y = this.crosshairY
    const r = 15

    this.crosshairGfx.lineStyle(2, 0x00ff66, 0.95)
    this.crosshairGfx.strokeCircle(x, y, r)
    this.crosshairGfx.lineBetween(x - 24, y, x - r - 2, y)
    this.crosshairGfx.lineBetween(x + r + 2, y, x + 24, y)
    this.crosshairGfx.lineBetween(x, y - 24, x, y - r - 2)
    this.crosshairGfx.lineBetween(x, y + r + 2, x, y + 24)

    // Wind drift preview (faint orange ring showing where arrow will actually land)
    const lx = x + this.windX
    const ly = y + this.windY
    this.crosshairGfx.lineStyle(1.5, 0xff8800, 0.5)
    this.crosshairGfx.strokeCircle(lx, ly, 9)
    this.crosshairGfx.lineStyle(1, 0xff8800, 0.25)
    this.crosshairGfx.lineBetween(x, y, lx, ly)
  }

  generateWind() {
    const maxDrift = this.targetRadius * 0.70
    const angle = Math.random() * Math.PI * 2
    const strength = 0.1 + Math.random() * 0.9
    this.windX = Math.cos(angle) * strength * maxDrift
    this.windY = Math.sin(angle) * strength * maxDrift * 0.6
    this.game.events.emit('archery_wind', { wx: this.windX, wy: this.windY, strength })
  }

  private onDown(ptr: Phaser.Input.Pointer) {
    if (this.phase !== 'aiming') return
    this.isDragging = true
    this.dragStartPtr = { x: ptr.x, y: ptr.y }
    this.crosshairAtDragStart = { x: this.crosshairX, y: this.crosshairY }
  }

  private onMove(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging || this.phase !== 'aiming') return
    const max = this.targetRadius * 1.4
    this.crosshairX = Phaser.Math.Clamp(
      this.crosshairAtDragStart.x + (ptr.x - this.dragStartPtr.x),
      this.targetX - max, this.targetX + max
    )
    this.crosshairY = Phaser.Math.Clamp(
      this.crosshairAtDragStart.y + (ptr.y - this.dragStartPtr.y),
      this.targetY - max, this.targetY + max
    )
    this.drawCrosshair()
  }

  private onUp() {
    if (!this.isDragging || this.phase !== 'aiming') return
    this.isDragging = false
    this.fireArrow()
  }

  private fireArrow() {
    this.phase = 'flying'
    this.crosshairGfx.setVisible(false)

    const startX = this.scale.width / 2
    const startY = this.scale.height * 0.87
    const landX = this.crosshairX + this.windX
    const landY = this.crosshairY + this.windY

    const progress = { t: 0 }
    const cpX = (startX + landX) / 2
    const cpY = Math.min(startY, landY) - this.scale.height * 0.12

    this.tweens.add({
      targets: progress,
      t: 1,
      duration: 520,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        const t = progress.t
        const px = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * landX
        const py = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * landY

        // Tangent for arrow rotation
        const tx2 = 2 * (1 - t) * (cpX - startX) + 2 * t * (landX - cpX)
        const ty2 = 2 * (1 - t) * (cpY - startY) + 2 * t * (landY - cpY)
        const angle = Math.atan2(ty2, tx2)
        const shaftLen = 26

        this.arrowGfx.clear()
        // Shaft
        this.arrowGfx.lineStyle(2, 0x8b4513, 1)
        this.arrowGfx.lineBetween(
          px - Math.cos(angle) * shaftLen, py - Math.sin(angle) * shaftLen,
          px, py
        )
        // Head
        this.arrowGfx.fillStyle(0x444444, 1)
        this.arrowGfx.fillTriangle(
          px + Math.cos(angle) * 10, py + Math.sin(angle) * 10,
          px + Math.cos(angle + 2.5) * 5, py + Math.sin(angle + 2.5) * 5,
          px + Math.cos(angle - 2.5) * 5, py + Math.sin(angle - 2.5) * 5
        )
        // Fletching
        const tail = { x: px - Math.cos(angle) * shaftLen, y: py - Math.sin(angle) * shaftLen }
        this.arrowGfx.lineStyle(2, 0xdd3333, 0.85)
        this.arrowGfx.lineBetween(tail.x, tail.y, tail.x + Math.cos(angle + 1.3) * 8, tail.y + Math.sin(angle + 1.3) * 8)
        this.arrowGfx.lineBetween(tail.x, tail.y, tail.x + Math.cos(angle - 1.3) * 8, tail.y + Math.sin(angle - 1.3) * 8)
      },
      onComplete: () => {
        this.arrowGfx.clear()
        this.onArrowLanded(landX, landY)
      },
    })
  }

  private onArrowLanded(landX: number, landY: number) {
    const s = this.targetRadius / 90
    const dx = landX - this.targetX
    const dy = landY - this.targetY
    const dist = Math.sqrt(dx * dx + dy * dy)

    let pts = 0
    let markerColor = 0xff4444
    if (dist <= 18 * s)      { pts = 10; markerColor = 0xffcc00 }
    else if (dist <= 36 * s) { pts = 8;  markerColor = 0xff4444 }
    else if (dist <= 54 * s) { pts = 6;  markerColor = 0x4488ff }
    else if (dist <= 72 * s) { pts = 4;  markerColor = 0x888888 }
    else if (dist <= 90 * s) { pts = 2;  markerColor = 0xdddddd }

    this.totalScore += pts
    this.arrowsLeft -= 1

    // Draw arrow stub in target
    this.markerGfx.fillStyle(markerColor, 0.9)
    this.markerGfx.fillCircle(landX, landY, 5)
    this.markerGfx.lineStyle(2, 0x000000, 0.5)
    this.markerGfx.strokeCircle(landX, landY, 5)
    // Short shaft stub
    this.markerGfx.lineStyle(2, 0x8b4513, 0.8)
    this.markerGfx.lineBetween(landX, landY + 5, landX, landY + 18)

    if (pts >= 8) playSwish()
    else if (pts > 0) playBounce()

    this.game.events.emit('archery_score', {
      pts,
      total: this.totalScore,
      arrowsLeft: this.arrowsLeft,
    })

    if (this.arrowsLeft <= 0) {
      this.time.delayedCall(700, () => {
        this.phase = 'done'
        this.crosshairGfx.setVisible(false)
        this.game.events.emit('archery_done', { total: this.totalScore })
      })
    } else {
      this.time.delayedCall(850, () => {
        this.crosshairX = this.targetX
        this.crosshairY = this.targetY
        this.generateWind()
        this.crosshairGfx.setVisible(true)
        this.drawCrosshair()
        this.phase = 'aiming'
      })
    }
  }
}
