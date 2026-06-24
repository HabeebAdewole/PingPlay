import Phaser from 'phaser'

const SETS = 2
const SET_DURATION = 30 // seconds
const DRAG_MULTIPLIER = 9
const MAX_DRAG = 120
const TRAJECTORY_DOTS = 12
const RIM_COLOR = 0xe05c00
const BALL_COLOR = 0xff6b00
const BOARD_COLOR = 0xffffff

export class BasketballScene extends Phaser.Scene {
  private ball!: Phaser.GameObjects.Arc
  private ballBody!: Phaser.Physics.Arcade.Body
  private scoreZone!: Phaser.GameObjects.Zone
  private graphics!: Phaser.GameObjects.Graphics

  private ballStart = { x: 0, y: 0 }
  private hoopX = 0
  private hoopY = 0
  private rimRadius = 28

  private isDragging = false
  private dragOrigin = { x: 0, y: 0 }
  private isInFlight = false
  private canScore = false

  private score = 0
  private currentSet = 1
  private timeLeft = SET_DURATION
  private timerEvent!: Phaser.Time.TimerEvent

  private scoreTxt!: Phaser.GameObjects.Text
  private timerTxt!: Phaser.GameObjects.Text
  private setTxt!: Phaser.GameObjects.Text

  constructor() {
    super('BasketballScene')
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height

    this.ballStart = { x: W / 2, y: H * 0.78 }
    this.hoopX = W / 2
    this.hoopY = H * 0.32

    this.graphics = this.add.graphics()
    this.drawCourt()

    // Ball
    this.ball = this.add.arc(this.ballStart.x, this.ballStart.y, 18, 0, 360, false, BALL_COLOR)
    this.physics.add.existing(this.ball)
    this.ballBody = this.ball.body as Phaser.Physics.Arcade.Body
    this.ballBody.setCircle(18)
    this.ballBody.setCollideWorldBounds(false)
    this.ballBody.allowGravity = false

    // Score zone — thin rectangle between front and back rim
    this.scoreZone = this.add.zone(this.hoopX, this.hoopY + 4, this.rimRadius * 2 - 10, 10)
    this.physics.add.existing(this.scoreZone, true)

    this.physics.add.overlap(this.ball, this.scoreZone, () => {
      if (this.canScore && this.ballBody.velocity.y > 0) {
        this.registerScore()
      }
    })

    // HUD
    const hudStyle = { fontSize: '20px', color: '#ffffff', fontFamily: 'system-ui' }
    this.scoreTxt = this.add.text(20, 20, 'Score: 0', { ...hudStyle, fontSize: '24px', fontStyle: 'bold' })
    this.timerTxt = this.add.text(W / 2, 20, `${SET_DURATION}s`, { ...hudStyle, fontSize: '28px', fontStyle: 'bold' }).setOrigin(0.5, 0)
    this.setTxt = this.add.text(W - 20, 20, `Set 1/${SETS}`, hudStyle).setOrigin(1, 0)

    // Input
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)

    this.startTimer()
  }

  private drawCourt() {
    const W = this.scale.width
    const H = this.scale.height
    const g = this.graphics
    g.clear()

    // Floor
    g.fillStyle(0x8b5e3c)
    g.fillRect(0, H * 0.88, W, H * 0.12)

    // Floor line
    g.lineStyle(3, 0xc8843f)
    g.strokeRect(20, H * 0.88, W - 40, H * 0.12 - 4)

    // Backboard
    g.fillStyle(BOARD_COLOR, 0.9)
    g.fillRect(this.hoopX - 50, this.hoopY - 54, 100, 60)
    g.lineStyle(3, 0xaaaaaa)
    g.strokeRect(this.hoopX - 50, this.hoopY - 54, 100, 60)

    // Inner square on backboard
    g.lineStyle(2, 0xff4444)
    g.strokeRect(this.hoopX - 18, this.hoopY - 36, 36, 28)

    // Pole
    g.fillStyle(0x888888)
    g.fillRect(this.hoopX + 50, this.hoopY - 54, 8, H * 0.88 - (this.hoopY - 54))

    // Rim (front arc)
    g.lineStyle(6, RIM_COLOR)
    g.strokeCircle(this.hoopX, this.hoopY, this.rimRadius)

    // Net lines
    g.lineStyle(1, 0xffffff, 0.6)
    const netTop = this.hoopY + this.rimRadius
    const netBot = netTop + 36
    const segments = 6
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI
      const topX = this.hoopX + Math.cos(Math.PI + angle) * this.rimRadius
      const botX = this.hoopX + (i - segments / 2) * 6
      g.lineBetween(topX, netTop, botX, netBot)
    }
    // Net bottom
    g.strokeRect(this.hoopX - 18, netBot - 2, 36, 4)
  }

  private onPointerDown(ptr: Phaser.Input.Pointer) {
    if (this.isInFlight || this.timeLeft <= 0) return
    const dist = Phaser.Math.Distance.Between(ptr.x, ptr.y, this.ball.x, this.ball.y)
    if (dist < 50) {
      this.isDragging = true
      this.dragOrigin = { x: ptr.x, y: ptr.y }
    }
  }

  private onPointerMove(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging) return
    this.graphics.clear()
    this.drawCourt()
    this.drawTrajectory(ptr)
  }

  private onPointerUp(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging) return
    this.isDragging = false

    const dx = Phaser.Math.Clamp(this.dragOrigin.x - ptr.x, -MAX_DRAG, MAX_DRAG)
    const dy = Phaser.Math.Clamp(this.dragOrigin.y - ptr.y, -MAX_DRAG, MAX_DRAG)

    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return

    this.graphics.clear()
    this.drawCourt()

    this.isInFlight = true
    this.canScore = false
    this.ballBody.allowGravity = true
    this.ballBody.setVelocity(dx * DRAG_MULTIPLIER, dy * DRAG_MULTIPLIER)

    // Allow scoring once ball is above hoop
    this.time.delayedCall(200, () => { this.canScore = true })
  }

  private drawTrajectory(ptr: Phaser.Input.Pointer) {
    const dx = Phaser.Math.Clamp(this.dragOrigin.x - ptr.x, -MAX_DRAG, MAX_DRAG)
    const dy = Phaser.Math.Clamp(this.dragOrigin.y - ptr.y, -MAX_DRAG, MAX_DRAG)
    const vx = dx * DRAG_MULTIPLIER
    const vy = dy * DRAG_MULTIPLIER
    const g = 900 / 1000 / 1000 // pixels per ms²

    this.graphics.fillStyle(0xffffff, 0.5)
    for (let i = 1; i <= TRAJECTORY_DOTS; i++) {
      const t = i * 80 // ms steps
      const px = this.ball.x + vx * (t / 1000)
      const py = this.ball.y + vy * (t / 1000) + 0.5 * g * t * t
      const alpha = 1 - i / (TRAJECTORY_DOTS + 1)
      this.graphics.fillStyle(0xffffff, alpha * 0.6)
      this.graphics.fillCircle(px, py, 4 - i * 0.2)
    }

    // Drag line
    this.graphics.lineStyle(2, 0xffffff, 0.3)
    this.graphics.lineBetween(this.ball.x, this.ball.y, ptr.x, ptr.y)
  }

  private registerScore() {
    this.canScore = false
    this.score++
    this.scoreTxt.setText(`Score: ${this.score}`)
    this.game.events.emit('score_update', this.score)
    this.showScoreFlash()
    this.resetBall()
  }

  private showScoreFlash() {
    const flash = this.add.text(this.hoopX, this.hoopY - 40, '+1', {
      fontSize: '32px', color: '#00ff88', fontStyle: 'bold', fontFamily: 'system-ui',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: flash,
      y: flash.y - 60,
      alpha: 0,
      duration: 700,
      onComplete: () => flash.destroy(),
    })
  }

  private resetBall() {
    this.isInFlight = false
    this.ballBody.allowGravity = false
    this.ballBody.setVelocity(0, 0)
    this.ball.setPosition(this.ballStart.x, this.ballStart.y)
  }

  private startTimer() {
    this.timeLeft = SET_DURATION
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: SET_DURATION - 1,
      callback: () => {
        this.timeLeft--
        this.timerTxt.setText(`${this.timeLeft}s`)
        if (this.timeLeft <= 5) this.timerTxt.setColor('#ff4444')
        if (this.timeLeft <= 0) this.endSet()
      },
    })
  }

  private endSet() {
    this.input.off('pointerdown', this.onPointerDown, this)
    this.input.off('pointermove', this.onPointerMove, this)
    this.input.off('pointerup', this.onPointerUp, this)
    this.ballBody.setVelocity(0, 0)
    this.ballBody.allowGravity = false

    this.game.events.emit('set_end', this.score, this.currentSet)

    if (this.currentSet < SETS) {
      this.showSetEndOverlay()
    }
  }

  startNextSet() {
    this.currentSet++
    this.setTxt.setText(`Set ${this.currentSet}/${SETS}`)
    this.timerTxt.setColor('#ffffff')
    this.resetBall()
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.startTimer()
  }

  private showSetEndOverlay() {
    const W = this.scale.width
    const H = this.scale.height
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)
    const txt = this.add.text(W / 2, H / 2 - 20, `Set ${this.currentSet} done!\nScore: ${this.score}`, {
      fontSize: '28px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'system-ui', align: 'center',
    }).setOrigin(0.5)
    const sub = this.add.text(W / 2, H / 2 + 50, 'Next set starting in 3...', {
      fontSize: '18px', color: '#aaaaaa', fontFamily: 'system-ui',
    }).setOrigin(0.5)

    let count = 3
    const countdown = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        count--
        if (count > 0) sub.setText(`Next set starting in ${count}...`)
        else {
          overlay.destroy()
          txt.destroy()
          sub.destroy()
          countdown.destroy()
          this.startNextSet()
        }
      },
    })
  }

  update() {
    if (!this.isInFlight) return

    // Reset if ball goes off screen
    const W = this.scale.width
    const H = this.scale.height
    if (
      this.ball.x < -50 || this.ball.x > W + 50 ||
      this.ball.y > H + 50
    ) {
      this.resetBall()
    }
  }
}
