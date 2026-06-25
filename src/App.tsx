import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Room from './pages/Room'
import Game from './pages/Game'
import ArcheryGame from './pages/ArcheryGame'
import BotBasketballGame from './pages/BotBasketballGame'
import BotArcheryGame from './pages/BotArcheryGame'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/room/:roomId/game" element={<Game />} />
        <Route path="/room/:roomId/archery" element={<ArcheryGame />} />
        <Route path="/play/basketball" element={<BotBasketballGame />} />
        <Route path="/play/archery" element={<BotArcheryGame />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
