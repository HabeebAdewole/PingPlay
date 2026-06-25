import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { nanoid } from 'nanoid'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

app.use(cors())
app.use(express.json())

// Bot score endpoint — replaces Python FastAPI bot, deployed on same Railway service
const DIFFICULTY_RANGES = {
  basketball: { easy: [0.15, 0.40], medium: [0.35, 0.60], hard: [0.55, 0.82] },
  archery:    { easy: [0.10, 0.40], medium: [0.35, 0.65], hard: [0.60, 0.90] },
}
const MAX_SCORES = { basketball: 20, archery: 30 }

function archeryBreakdown(total) {
  const valid = [0, 2, 4, 6, 8, 10]
  const arrows = [0, 0, 0]
  let remaining = total
  for (let i = 0; i < 3; i++) {
    const maxArrow = Math.min(10, remaining)
    const choices = valid.filter(v => v <= maxArrow && (remaining - v) <= 10 * (2 - i))
    arrows[i] = choices[Math.floor(Math.random() * choices.length)] ?? 0
    remaining -= arrows[i]
  }
  return arrows
}

app.post('/bot/score', async (req, res) => {
  const { game, difficulty, player_score } = req.body
  const ranges = DIFFICULTY_RANGES[game]?.[difficulty] ?? DIFFICULTY_RANGES.basketball.medium
  const max = MAX_SCORES[game] ?? 20

  let [lo, hi] = ranges
  const ratio = (player_score ?? 0) / max
  if (ratio > 0.75) hi = Math.min(hi + 0.08, 0.95)
  else if (ratio < 0.25) lo = Math.max(lo - 0.08, 0.05)

  const raw = lo + Math.random() * (hi - lo)
  const bot_score = Math.min(max, Math.max(0, Math.round(raw * max)))

  // Simulate thinking delay
  await new Promise(r => setTimeout(r, 1800 + Math.random() * 1400))

  const breakdown = game === 'archery' ? archeryBreakdown(bot_score) : []
  res.json({ bot_score, difficulty_used: difficulty, breakdown })
})

// rooms[roomId] = { players: [{ id, name }], status: 'waiting' | 'ready' | 'playing' }
const rooms = {}

app.post('/room/create', (req, res) => {
  const roomId = nanoid(6).toUpperCase()
  const gameType = req.body?.gameType || 'basketball'
  rooms[roomId] = { players: [], status: 'waiting', gameType }
  res.json({ roomId, gameType })
})

app.get('/room/:roomId', (req, res) => {
  const room = rooms[req.params.roomId]
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json(room)
})

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId, playerName }) => {
    const room = rooms[roomId]
    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full' })
      return
    }

    socket.join(roomId)
    socket.data.roomId = roomId
    socket.data.playerName = playerName

    room.players.push({ id: socket.id, name: playerName })

    io.to(roomId).emit('room_update', room)
  })

  socket.on('player_ready', () => {
    const { roomId } = socket.data
    const room = rooms[roomId]
    if (!room) return

    const player = room.players.find((p) => p.id === socket.id)
    if (player) player.ready = true

    const allReady = room.players.length === 2 && room.players.every((p) => p.ready)
    if (allReady) room.status = 'playing'

    io.to(roomId).emit('room_update', room)
  })

  socket.on('set_score', ({ roomId, set, score }) => {
    // Relay set score to the other player in the room
    socket.to(roomId).emit('opponent_set_score', { set, score })
  })

  socket.on('disconnecting', () => {
    const { roomId } = socket.data
    if (!roomId || !rooms[roomId]) return

    rooms[roomId].players = rooms[roomId].players.filter((p) => p.id !== socket.id)
    rooms[roomId].status = 'waiting'

    io.to(roomId).emit('room_update', rooms[roomId])

    if (rooms[roomId].players.length === 0) delete rooms[roomId]
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => console.log(`PingPlay server running on port ${PORT}`))
