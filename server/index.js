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

// rooms[roomId] = { players: [{ id, name }], status: 'waiting' | 'ready' | 'playing' }
const rooms = {}

app.post('/room/create', (req, res) => {
  const roomId = nanoid(6).toUpperCase()
  rooms[roomId] = { players: [], status: 'waiting' }
  res.json({ roomId })
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
