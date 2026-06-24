import Phaser from 'phaser'

const SETS = 2
const SET_DURATION = 30
const SWIPE_MULTIPLIER = 5.5
const MAX_SWIPE = 180
const TRAJECTORY_DOTS = 14
const GRAVITY = 900

export class BasketballScene extends Phaser.Scene {
  private ball!: Phaser.GameObjects.Graphics
  private ballCircle!: Phaser.GameObjects.Arc
  private ballBody!: Phaser.Physics.Arcade.Body
  private scoreZone!: Phaser.GameObjects.Zone
  private courtGraphics!: Phaser.GameObjects.Graphics
  private overlayGraphics!: Phaser.GameObjects.Graphics

  private ballX = 0
  private ballY = 0
  private hoopX = 0
  private hoopY = 0
  private rimR = 32

  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private isInFlight = false
  private canScore = false
  private ballPassedAboveRim = false

  private score = 0
  private currentSet = 1
  private timeLeft = SET_DURATION

  private scoreTxt!: Phaser.GameObjects.Text
  private timerTxt!: Phaser.GameObjects.Text
  private setTxt!: Phaser.GameObjects.Text
  private swipeHint!: Phaser.GameObjects.Text

  constructor() {
    super('BasketballScene')
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height

    this.ballX = W / 2
    this.ballY = H * 0.80
    this.hoopX = W / 2
    this.hoopY = H * 0.28

    this.courtGraphics = this.add.graphics()
    this.overlayGraphics = this.add.graphics()

    this.drawCourt()

    // Ball (composite: orange circle + seam lines)
    this.ballCircle = this.add.arc(this.ballX, this.ballY, 22, 0, 360, false, 0xff6b1a)
    this.physics.add.existing(this.ballCircle)
    this.ballBody = this.ballCircle.body as Phaser.Physics.Arcade.Body
    this.ballBody.setCircle(22)
    this.ballBody.allowGravity = false

    this.drawBallSeams()

    // Score zone between rims (going downward through hoop)
    this.scoreZone = this.add.zone(this.hoopX, this.hoopY + 6, this.rimR * 2 - 16, 12)
    this.physics.add.existing(this.scoreZone, true)

    this.physics.add.overlap(this.ballCircle, this.scoreZone, () => {
      if (this.canScore && this.ballBody.velocity.y > 60 && this.ballPassedAboveRim) {
        this.registerScore()
      }
    })

    // HUD
    this.scoreTxt = this.add.text(24, 24, '0', {
      fontSize: '52px', color: '#ffffff', fontFamily: 'system-ui', fontStyle: 'bold',
    })
    this.add.text(24, 78, 'SCORE', {
      fontSize: '12px', color: '#ffffff80', fontFamily: 'system-ui', letterSpacing: 3,
    })

    this.timerTxt = this.add.text(W / 2, 24, `${SET_DURATION}`, {
      fontSize: '52px', color: '#ffffff', fontFamily: 'system-ui', fontStyle: 'bold',
    }).setOrigin(0.5, 0)
    this.add.text(W / 2, 78, 'SECS', {
      fontSize: '12px', color: '#ffffff80', fontFamily: 'system-ui', letterSpacing: 3,
    }).setOrigin(0.5, 0)

    this.setTxt = this.add.text(W - 24, 24, `SET ${this.currentSet}/${SETS}`, {
      fontSize: '16px', color: '#ffffff80', fontFamily: 'system-ui', fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(1, 0)

    this.swipeHint = this.add.text(W / 2, this.ballY + 50, '↑  swipe up to shoot', {
      fontSize: '14px', color: '#ffffff50', fontFamily: 'system-ui',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: this.swipeHint,
      alpha: 0,
      delay: 2500,
      duration: 800,
    })

    // Input
    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)

    this.startTimer()
  }

  private drawCourt() {
    const W = this.scale.width
    const H = this.scale.height
    const g = this.courtGraphics
    g.clear()

    // Sky gradient background
    g.fillStyle(0x0f1b35)
    g.fillRect(0, 0, W, H)

    // Court floor (wood)
    const floorY = H * 0.86
    g.fillStyle(0xc17a2e)
    g.fillRect(0, floorY, W, H - floorY)

    // Floor planks
    g.lineStyle(1, 0xa8621a, 0.4)
    for (let i = 0; i < 6; i++) {
      g.lineBetween(0, floorY + i * 16, W, floorY + i * 16)
    }

    // Court line
    g.lineStyle(3, 0xffe4b0, 0.8)
    g.lineBetween(0, floorY, W, floorY)

    // Three-point arc suggestion (decorative) — drawn as line segments
    g.lineStyle(2, 0xffe4b0, 0.15)
    const arcR = W * 0.45
    const arcSegs = 24
    for (let i = 0; i < arcSegs; i++) {
      const a1 = Math.PI + (i / arcSegs) * Math.PI
      const a2 = Math.PI + ((i + 1) / arcSegs) * Math.PI
      g.lineBetween(
        W / 2 + Math.cos(a1) * arcR, floorY + Math.sin(a1) * arcR,
        W / 2 + Math.cos(a2) * arcR, floorY + Math.sin(a2) * arcR,
      )
    }

    // Pole
    g.fillStyle(0x8899aa)
    g.fillRect(this.hoopX + this.rimR + 10, this.hoopY - 50, 7, H * 0.86 - (this.hoopY - 50))

    // Backboard
    g.fillStyle(0xddeeff, 0.92)
    g.fillRoundedRect(this.hoopX - 52, this.hoopY - 58, 104, 52, 4)
    g.lineStyle(3, 0x99bbdd)
    g.strokeRoundedRect(this.hoopX - 52, this.hoopY - 58, 104, 52, 4)

    // Shooter's square
    g.lineStyle(2, 0xff4444, 0.9)
    g.strokeRect(this.hoopX - 20, this.hoopY - 42, 40, 28)

    // Back rim (darker, behind)
    g.lineStyle(7, 0xb84400)
    g.strokeCircle(this.hoopX + this.rimR * 0.15, this.hoopY + 4, this.rimR * 0.5)

    // Front rim
    g.lineStyle(7, 0xff6600)
    g.strokeCircle(this.hoopX, this.hoopY, this.rimR)

    // Net
    this.drawNet(g)
  }

  private drawNet(g: Phaser.GameObjects.Graphics) {
    const netTop = this.hoopY + this.rimR - 4
    const netBot = netTop + 44
    const leftX = this.hoopX - this.rimR + 6
    const rightX = this.hoopX + this.rimR - 6
    const segments = 7

    g.lineStyle(1.5, 0xffffff, 0.55)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const tx = leftX + t * (rightX - leftX)
      const bx = this.hoopX + (i - segments / 2) * 5.5
      g.lineBetween(tx, netTop, bx, netBot)
    }
    // Horizontal net rows
    for (let row = 1; row <= 3; row++) {
      const ry = netTop + (row / 4) * (netBot - netTop)
      const spread = (1 - row / 4) * (rightX - leftX) / 2
      g.lineBetween(this.hoopX - spread, ry, this.hoopX + spread, ry)
    }
  }

  private drawBallSeams() {
    // Seams drawn as overlay graphics on ball position
    const g = this.overlayGraphics
    g.clear()

    if (this.isInFlight) return

    const bx = this.ballCircle.x
    const by = this.ballCircle.y
    const r = 22

    g.lineStyle(1.5, 0x991100, 0.8)
    // Outer circle
    g.strokeCircle(bx, by, r)
    // Horizontal seam
    g.lineBetween(bx - r, by, bx + r, by)
    // Left curved seam (approximate arc with segments)
    const seamSegs = 10
    for (let i = 0; i < seamSegs; i++) {
      const a1 = Math.PI / 2 + (i / seamSegs) * Math.PI
      const a2 = Math.PI / 2 + ((i + 1) / seamSegs) * Math.PI
      g.lineBetween(bx - 6 + Math.cos(a1) * r * 0.7, by + Math.sin(a1) * r * 0.7,
        bx - 6 + Math.cos(a2) * r * 0.7, by + Math.sin(a2) * r * 0.7)
      g.lineBetween(bx + 6 - Math.cos(a1) * r * 0.7, by + Math.sin(a1) * r * 0.7,
        bx + 6 - Math.cos(a2) * r * 0.7, by + Math.sin(a2) * r * 0.7)
    }
  }

  private onDown(ptr: Phaser.Input.Pointer) {
    if (this.isInFlight || this.timeLeft <= 0) return
    const dist = Phaser.Math.Distance.Between(ptr.x, ptr.y, this.ballCircle.x, this.ballCircle.y)
    if (dist < 60) {
      this.isDragging = true
      this.dragStart = { x: ptr.x, y: ptr.y }
    }
  }

  private onMove(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging) return
    this.overlayGraphics.clear()
    this.drawTrajectoryPreview(ptr)
  }

  private onUp(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging) return
    this.isDragging = false
    this.overlayGraphics.clear()

    // Swipe direction = pointer moved relative to drag start
    const dx = Phaser.Math.Clamp(ptr.x - this.dragStart.x, -MAX_SWIPE, MAX_SWIPE)
    const dy = Phaser.Math.Clamp(ptr.y - this.dragStart.y, -MAX_SWIPE, MAX_SWIPE)

    // Only shoot if swiped upward enough
    if (dy > -20) return

    this.shoot(dx * SWIPE_MULTIPLIER, dy * SWIPE_MULTIPLIER)
  }

  private shoot(vx: number, vy: number) {
    this.isInFlight = true
    this.canScore = false
    this.ballPassedAboveRim = false
    this.ballBody.allowGravity = true
    this.ballBody.setVelocity(vx, vy)

    this.swipeHint.setVisible(false)

    // Allow scoring after ball travels a bit
    this.time.delayedCall(300, () => { this.canScore = true })
  }

  private drawTrajectoryPreview(ptr: Phaser.Input.Pointer) {
    const dx = Phaser.Math.Clamp(ptr.x - this.dragStart.x, -MAX_SWIPE, MAX_SWIPE)
    const dy = Phaser.Math.Clamp(ptr.y - this.dragStart.y, -MAX_SWIPE, MAX_SWIPE)

    if (dy > -20) return

    const vx = dx * SWIPE_MULTIPLIER
    const vy = dy * SWIPE_MULTIPLIER
    const g = GRAVITY / (1000 * 1000) // px per ms²

    const bx = this.ballCircle.x
    const by = this.ballCircle.y

    for (let i = 1; i <= TRAJECTORY_DOTS; i++) {
      const t = i * 70
      const px = bx + vx * (t / 1000)
      const py = by + vy * (t / 1000) + 0.5 * g * t * t

      const alpha = (1 - i / (TRAJECTORY_DOTS + 1)) * 0.75
      const size = Math.max(2, 5 - i * 0.25)

      this.overlayGraphics.fillStyle(0xffffff, alpha)
      this.overlayGraphics.fillCircle(px, py, size)
    }

    // Swipe direction arrow on ball
    this.overlayGraphics.lineStyle(2, 0xffffff, 0.4)
    this.overlayGraphics.lineBetween(bx, by, bx + dx * 0.4, by + dy * 0.4)
  }

  private registerScore() {
    this.canScore = false
    this.score++
    this.scoreTxt.setText(`${this.score}`)
    this.game.events.emit('score_update', this.score)
    this.flashScore()
    this.time.delayedCall(150, () => this.resetBall())
  }

  private flashScore() {
    const W = this.scale.width
    const flash = this.add.text(W / 2, this.hoopY - 30, '+1', {
      fontSize: '38px', color: '#00ff88', fontStyle: 'bold', fontFamily: 'system-ui',
    }).setOrigin(0.5).setAlpha(1)

    this.tweens.add({
      targets: flash,
      y: flash.y - 70,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    })

    // Brief rim flash
    this.tweens.add({
      targets: this.courtGraphics,
      alpha: 0.7,
      yoyo: true,
      duration: 80,
    })
  }

  private resetBall() {
    this.isInFlight = false
    this.ballBody.allowGravity = false
    this.ballBody.setVelocity(0, 0)
    this.ballCircle.setPosition(this.ballX, this.ballY)
    this.drawBallSeams()
  }

  private startTimer() {
    this.timeLeft = SET_DURATION
    this.time.addEvent({
      delay: 1000,
      repeat: SET_DURATION - 1,
      callback: () => {
        this.timeLeft--
        this.timerTxt.setText(`${this.timeLeft}`)
        if (this.timeLeft <= 5) {
          this.timerTxt.setColor('#ff4444')
          this.cameras.main.shake(80, 0.003)
        }
        if (this.timeLeft <= 0) this.endSet()
      },
    })
  }

  private endSet() {
    this.input.off('pointerdown', this.onDown, this)
    this.input.off('pointermove', this.onMove, this)
    this.input.off('pointerup', this.onUp, this)
    this.ballBody.setVelocity(0, 0)
    this.ballBody.allowGravity = false

    this.game.events.emit('set_end', this.score, this.currentSet)

    if (this.currentSet < SETS) {
      this.showSetBreak()
    }
  }

  private showSetBreak() {
    const W = this.scale.width
    const H = this.scale.height

    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.78)
    const setLabel = this.add.text(W / 2, H / 2 - 60, `SET ${this.currentSet} DONE`, {
      fontSize: '14px', color: '#ffffff80', fontFamily: 'system-ui', letterSpacing: 4,
    }).setOrigin(0.5)
    const scoreTxt = this.add.text(W / 2, H / 2 - 20, `${this.score}`, {
      fontSize: '80px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'system-ui',
    }).setOrigin(0.5)
    const sub = this.add.text(W / 2, H / 2 + 60, 'Next set in 3', {
      fontSize: '18px', color: '#ffffff60', fontFamily: 'system-ui',
    }).setOrigin(0.5)

    let count = 3
    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        count--
        if (count > 0) sub.setText(`Next set in ${count}`)
        else {
          bg.destroy(); setLabel.destroy(); scoreTxt.destroy(); sub.destroy()
          this.startNextSet()
        }
      },
    })
  }

  startNextSet() {
    this.currentSet++
    this.setTxt.setText(`SET ${this.currentSet}/${SETS}`)
    this.timerTxt.setColor('#ffffff')
    this.resetBall()
    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
    this.startTimer()
  }

  update() {
    if (!this.isInFlight) return

    const bx = this.ballCircle.x
    const by = this.ballCircle.y
    const W = this.scale.width
    const H = this.scale.height

    // Track when ball is above rim level (needed for clean score detection)
    if (by < this.hoopY - 10) this.ballPassedAboveRim = true

    // Reset if off screen
    if (bx < -60 || bx > W + 60 || by > H + 60) {
      this.resetBall()
    }

    // Draw seams while in flight (just redraw around current position)
    this.overlayGraphics.clear()
  }
}
