import Phaser from 'phaser'

const SET_DURATION = 30
const SWIPE_MULTIPLIER = 5.8
const MAX_SWIPE = 200
const GRAVITY = 950
const TRAJECTORY_DOTS = 15

export class BasketballScene extends Phaser.Scene {
  private ball!: Phaser.GameObjects.Image
  private ballBody!: Phaser.Physics.Arcade.Body
  private scoreZone!: Phaser.GameObjects.Zone
  private trajectoryGfx!: Phaser.GameObjects.Graphics

  private ballStartX = 0
  private ballStartY = 0
  private hoopX = 0
  private hoopY = 0 // rim center Y

  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private isInFlight = false
  private canScore = false
  private passedAboveRim = false

  currentSet = 1
  timeLeft = SET_DURATION

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
    this.hoopY = H * 0.30        // rim center
    this.ballStartX = W / 2
    this.ballStartY = H * 0.78

    // Hoop image — origin set so rim center (80/160, 80/150) aligns with hoopX/Y
    this.add.image(this.hoopX, this.hoopY, 'hoop').setOrigin(0.5, 80 / 150)

    // Ball
    this.ball = this.add.image(this.ballStartX, this.ballStartY, 'basketball').setOrigin(0.5, 0.5)
    this.physics.add.existing(this.ball)
    this.ballBody = this.ball.body as Phaser.Physics.Arcade.Body
    this.ballBody.setCircle(23, 2, 2)
    this.ballBody.allowGravity = false

    // Score zone — thin strip across rim opening
    this.scoreZone = this.add.zone(this.hoopX, this.hoopY + 5, 52, 12)
    this.physics.add.existing(this.scoreZone, true)

    this.physics.add.overlap(this.ball, this.scoreZone, () => {
      if (this.canScore && this.ballBody.velocity.y > 50 && this.passedAboveRim) {
        this.onScore()
      }
    })

    // Trajectory graphics
    this.trajectoryGfx = this.add.graphics()

    // Input
    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
  }

  private onDown(ptr: Phaser.Input.Pointer) {
    if (this.isInFlight || this.timeLeft <= 0) return
    const dist = Phaser.Math.Distance.Between(ptr.x, ptr.y, this.ball.x, this.ball.y)
    if (dist < 64) {
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
    this.drawTrajectory(dx * SWIPE_MULTIPLIER, dy * SWIPE_MULTIPLIER)
  }

  private onUp(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging) return
    this.isDragging = false
    this.trajectoryGfx.clear()

    const dx = Phaser.Math.Clamp(ptr.x - this.dragStart.x, -MAX_SWIPE, MAX_SWIPE)
    const dy = Phaser.Math.Clamp(ptr.y - this.dragStart.y, -MAX_SWIPE, MAX_SWIPE)
    if (dy > -15) return

    this.shoot(dx * SWIPE_MULTIPLIER, dy * SWIPE_MULTIPLIER)
  }

  private shoot(vx: number, vy: number) {
    this.isInFlight = true
    this.canScore = false
    this.passedAboveRim = false
    this.ballBody.allowGravity = true
    this.ballBody.setVelocity(vx, vy)
    this.time.delayedCall(250, () => { this.canScore = true })
  }

  private drawTrajectory(vx: number, vy: number) {
    const g = GRAVITY / (1000 * 1000)
    const bx = this.ball.x
    const by = this.ball.y

    for (let i = 1; i <= TRAJECTORY_DOTS; i++) {
      const t = i * 65
      const px = bx + vx * (t / 1000)
      const py = by + vy * (t / 1000) + 0.5 * g * t * t
      const alpha = (1 - i / (TRAJECTORY_DOTS + 1)) * 0.65
      const r = Math.max(2, 5 - i * 0.22)
      this.trajectoryGfx.fillStyle(0xffffff, alpha)
      this.trajectoryGfx.fillCircle(px, py, r)
    }
  }

  private onScore() {
    this.canScore = false
    this.game.events.emit('basket')
    this.showScoreFlash()
    this.time.delayedCall(120, () => this.resetBall())
  }

  private showScoreFlash() {
    const flash = this.add.text(this.hoopX, this.hoopY - 40, '+1', {
      fontSize: '36px', color: '#00ff88', fontStyle: 'bold', fontFamily: 'system-ui',
    }).setOrigin(0.5)
    this.tweens.add({
      targets: flash, y: flash.y - 65, alpha: 0, duration: 550, ease: 'Power2',
      onComplete: () => flash.destroy(),
    })
  }

  resetBall() {
    this.isInFlight = false
    this.ballBody.allowGravity = false
    this.ballBody.setVelocity(0, 0)
    this.ball.setPosition(this.ballStartX, this.ballStartY)
  }

  disableInput() {
    this.input.off('pointerdown', this.onDown, this)
    this.input.off('pointermove', this.onMove, this)
    this.input.off('pointerup', this.onUp, this)
    this.resetBall()
  }

  enableInput() {
    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
  }

  update() {
    if (!this.isInFlight) return
    const W = this.scale.width
    const H = this.scale.height
    if (this.ball.y < this.hoopY - 15) this.passedAboveRim = true
    if (this.ball.x < -80 || this.ball.x > W + 80 || this.ball.y > H + 80) {
      this.resetBall()
    }
  }
}
