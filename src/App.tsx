import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Room from './pages/Room'
import Game from './pages/Game'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/room/:roomId/game" element={<Game />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
