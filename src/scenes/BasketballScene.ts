import Phaser from 'phaser'
import { playSwish, playBounce, playShoot, playBeep, playFinalBuzzer } from '../utils/audio'

const SWIPE_MULTIPLIER = 9.5
const MAX_SWIPE = 280
const TRAJECTORY_DOTS = 15

interface BallState {
  canScore: boolean
  passedAboveRim: boolean
}

export class BasketballScene extends Phaser.Scene {
  private ballGroup!: Phaser.Physics.Arcade.Group
  private currentBall!: Phaser.GameObjects.Image
  private scoreZone!: Phaser.GameObjects.Zone
  private trajectoryGfx!: Phaser.GameObjects.Graphics
  private hoopImage!: Phaser.GameObjects.Image

  private ballStates = new Map<number, BallState>()

  private ballStartX = 0
  private ballStartY = 0
  private hoopX = 0
  private hoopY = 0

  private isDragging = false
  private dragStart = { x: 0, y: 0 }

  timeLeft = 30
  currentSet = 1
  private urgentBeepsLeft = 5

  constructor() {
    super('BasketballScene')
  }

  preload() {
    this.load.svg('basketball', '/assets/basketball.svg', { width: 50, height: 50 })
    this.load.svg('hoop', '/assets/hoop.svg', { width: 160, height: 150 })
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height

    this.hoopX = W / 2
    this.hoopY = H * 0.36
    this.ballStartX = W / 2
    this.ballStartY = H * 0.80

    // Hoop — origin anchored at rim center (80/160, 80/150)
    this.hoopImage = this.add.image(this.hoopX, this.hoopY, 'hoop').setOrigin(0.5, 80 / 150)

    // Ball group
    this.ballGroup = this.physics.add.group()
    this.spawnBall()

    // Score zone
    this.scoreZone = this.add.zone(this.hoopX, this.hoopY + 6, 72, 18)
    this.physics.add.existing(this.scoreZone, true)

    this.physics.add.overlap(this.ballGroup, this.scoreZone, (ballObj) => {
      const ball = ballObj as Phaser.GameObjects.Image
      const state = this.ballStates.get(ball.name as unknown as number)
      const body = ball.body as Phaser.Physics.Arcade.Body
      if (state?.canScore && body.velocity.y > 20 && state.passedAboveRim) {
        state.canScore = false
        this.onScore(ball)
      }
    })

    // Trajectory graphics
    this.trajectoryGfx = this.add.graphics()

    // Input
    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
  }

  private spawnBall() {
    const ball = this.ballGroup.create(this.ballStartX, this.ballStartY, 'basketball') as Phaser.GameObjects.Image
    ball.setOrigin(0.5, 0.5)
    ball.setDepth(10)
    const body = ball.body as Phaser.Physics.Arcade.Body
    body.setCircle(23, 2, 2)
    body.allowGravity = false
    body.setVelocity(0, 0)

    const id = ball.x + Date.now()
    ball.name = String(id)
    this.ballStates.set(id, { canScore: false, passedAboveRim: false })

    this.currentBall = ball
    return ball
  }

  private onDown(ptr: Phaser.Input.Pointer) {
    if (this.timeLeft <= 0) return
    const dist = Phaser.Math.Distance.Between(ptr.x, ptr.y, this.currentBall.x, this.currentBall.y)
    if (dist < 70) {
      this.isDragging = true
      this.dragStart = { x: ptr.x, y: ptr.y }
    }
  }

  private onMove(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging) return
    this.trajectoryGfx.clear()
    const dx = Phaser.Math.Clamp(ptr.x - this.dragStart.x, -MAX_SWIPE, MAX_SWIPE)
    const dy = Phaser.Math.Clamp(ptr.y - this.dragStart.y, -MAX_SWIPE, MAX_SWIPE)
    if (dy > -15) return
    this.drawTrajectory(this.currentBall.x, this.currentBall.y, dx * SWIPE_MULTIPLIER, dy * SWIPE_MULTIPLIER)
  }

  private onUp(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging) return
    this.isDragging = false
    this.trajectoryGfx.clear()

    const dx = Phaser.Math.Clamp(ptr.x - this.dragStart.x, -MAX_SWIPE, MAX_SWIPE)
    const dy = Phaser.Math.Clamp(ptr.y - this.dragStart.y, -MAX_SWIPE, MAX_SWIPE)
    if (dy > -15) return

    this.shoot(this.currentBall, dx * SWIPE_MULTIPLIER, dy * SWIPE_MULTIPLIER)
    playShoot()

    // Spawn next ball immediately
    this.spawnBall()
  }

  private shoot(ball: Phaser.GameObjects.Image, vx: number, vy: number) {
    const body = ball.body as Phaser.Physics.Arcade.Body
    body.allowGravity = true
    body.setVelocity(vx, vy)

    const id = Number(ball.name)
    const state = this.ballStates.get(id)
    if (state) {
      this.time.delayedCall(120, () => { state.canScore = true })
    }
  }

  private drawTrajectory(bx: number, by: number, vx: number, vy: number) {
    const g = 620 / (1000 * 1000)
    for (let i = 1; i <= TRAJECTORY_DOTS; i++) {
      const t = i * 65
      const px = bx + vx * (t / 1000)
      const py = by + vy * (t / 1000) + 0.5 * g * t * t
      const alpha = (1 - i / (TRAJECTORY_DOTS + 1)) * 0.65
      const r = Math.max(1.5, 5 - i * 0.24)
      this.trajectoryGfx.fillStyle(0xffffff, alpha)
      this.trajectoryGfx.fillCircle(px, py, r)
    }
  }

  private onScore(ball: Phaser.GameObjects.Image) {
    playSwish()
    this.game.events.emit('basket')
    this.animateNet()
    this.showScoreFlash()
    // Remove ball after slight delay (let it visually pass through net)
    this.time.delayedCall(200, () => {
      this.ballStates.delete(Number(ball.name))
      ball.destroy()
    })
  }

  private animateNet() {
    // Hoop nudge down then spring back
    this.tweens.add({
      targets: this.hoopImage,
      y: this.hoopImage.y + 7,
      scaleX: 0.97,
      duration: 70,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.hoopImage,
          y: this.hoopImage.y - 2,
          duration: 60,
          yoyo: true,
        })
      },
    })

    // Particle burst at rim
    const particles = this.add.particles(this.hoopX, this.hoopY + 8, '__DEFAULT', {
      speed: { min: 60, max: 130 },
      angle: { min: 60, max: 120 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xff6600, 0xffffff, 0x00ff88],
      lifespan: 350,
      quantity: 12,
      gravityY: 300,
    })
    this.time.delayedCall(400, () => particles.destroy())
  }

  private showScoreFlash() {
    const flash = this.add.text(this.hoopX, this.hoopY - 50, '+1', {
      fontSize: '40px', color: '#00ff88', fontStyle: 'bold', fontFamily: 'system-ui',
    }).setOrigin(0.5).setDepth(20)
    this.tweens.add({
      targets: flash, y: flash.y - 70, alpha: 0, duration: 600, ease: 'Power2',
      onComplete: () => flash.destroy(),
    })
  }

  // Called from Game.tsx timer
  onTimerTick(timeLeft: number) {
    this.timeLeft = timeLeft
    if (timeLeft <= 5 && timeLeft > 0) {
      playBeep(timeLeft <= 2 ? 1100 : 880)
    }
    if (timeLeft === 0) {
      playFinalBuzzer()
    }
  }

  disableInput() {
    this.isDragging = false
    this.trajectoryGfx.clear()
    this.input.off('pointerdown', this.onDown, this)
    this.input.off('pointermove', this.onMove, this)
    this.input.off('pointerup', this.onUp, this)
    // Clear all in-flight balls except current
    this.ballGroup.getChildren().forEach((b) => {
      const ball = b as Phaser.GameObjects.Image
      if (ball !== this.currentBall) {
        this.ballStates.delete(Number(ball.name))
        ball.destroy()
      }
    })
    const body = this.currentBall?.body as Phaser.Physics.Arcade.Body
    if (body) { body.setVelocity(0, 0); body.allowGravity = false }
    this.currentBall?.setPosition(this.ballStartX, this.ballStartY)
  }

  enableInput() {
    this.urgentBeepsLeft = 5
    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
  }

  update() {
    const W = this.scale.width
    const H = this.scale.height

    this.ballGroup.getChildren().forEach((b) => {
      const ball = b as Phaser.GameObjects.Image
      if (ball === this.currentBall) return // don't clean up current

      const body = ball.body as Phaser.Physics.Arcade.Body
      const id = Number(ball.name)
      const state = this.ballStates.get(id)

      if (state && ball.y < this.hoopY + 15) state.passedAboveRim = true

      // Miss — play bounce when ball exits screen bottom
      if (ball.y > H + 60) {
        playBounce()
        this.ballStates.delete(id)
        ball.destroy()
      } else if (ball.x < -80 || ball.x > W + 80) {
        this.ballStates.delete(id)
        ball.destroy()
      }
    })
  }
}
