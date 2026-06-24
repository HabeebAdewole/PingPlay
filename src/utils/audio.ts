let ctx: AudioContext | null = null

function ac() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function initAudio() { ac() }

export function playSwish() {
  const a = ac()
  const dur = 0.38
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    const t = i / a.sampleRate
    const env = Math.exp(-t * 9) * (1 - Math.exp(-t * 50))
    d[i] = (Math.random() * 2 - 1) * env * 0.5
  }
  const src = a.createBufferSource()
  src.buffer = buf
  const hpf = a.createBiquadFilter()
  hpf.type = 'bandpass'
  hpf.frequency.value = 3500
  hpf.Q.value = 0.6
  const gain = a.createGain()
  gain.gain.value = 0.55
  src.connect(hpf); hpf.connect(gain); gain.connect(a.destination)
  src.start()

  // Short "whoosh" tone underneath
  const osc = a.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(320, a.currentTime)
  osc.frequency.exponentialRampToValueAtTime(120, a.currentTime + 0.18)
  const g2 = a.createGain()
  g2.gain.setValueAtTime(0.12, a.currentTime)
  g2.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.22)
  osc.connect(g2); g2.connect(a.destination)
  osc.start(); osc.stop(a.currentTime + 0.22)
}

export function playBounce() {
  const a = ac()
  const osc = a.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(220, a.currentTime)
  osc.frequency.exponentialRampToValueAtTime(70, a.currentTime + 0.12)
  const g = a.createGain()
  g.gain.setValueAtTime(0.25, a.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18)
  osc.connect(g); g.connect(a.destination)
  osc.start(); osc.stop(a.currentTime + 0.18)
}

export function playShoot() {
  const a = ac()
  const buf = a.createBuffer(1, a.sampleRate * 0.12, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    const t = i / a.sampleRate
    d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.15
  }
  const src = a.createBufferSource()
  src.buffer = buf
  const hpf = a.createBiquadFilter()
  hpf.type = 'highpass'
  hpf.frequency.value = 1200
  src.connect(hpf); hpf.connect(a.destination)
  src.start()
}

export function playBeep(freq = 880) {
  const a = ac()
  const osc = a.createOscillator()
  osc.type = 'square'
  osc.frequency.value = freq
  const g = a.createGain()
  g.gain.setValueAtTime(0.08, a.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.09)
  osc.connect(g); g.connect(a.destination)
  osc.start(); osc.stop(a.currentTime + 0.09)
}

export function playFinalBuzzer() {
  const a = ac()
  const osc = a.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = 180
  const g = a.createGain()
  g.gain.setValueAtTime(0.2, a.currentTime)
  g.gain.setValueAtTime(0.2, a.currentTime + 0.6)
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.8)
  osc.connect(g); g.connect(a.destination)
  osc.start(); osc.stop(a.currentTime + 0.8)
}
