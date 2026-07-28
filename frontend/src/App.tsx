
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PlayerLanding from './pages/PlayerLanding';
import AdminLanding from './pages/AdminLanding';
import PlayerRoom from './pages/PlayerRoom';
import AdminRoom from './pages/AdminRoom';
import PresentationRoom from './pages/PresentationRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayerLanding />} />
        <Route path="/room/:roomCode" element={<PlayerRoom />} />
        <Route path="/admin" element={<AdminLanding />} />
        <Route path="/admin/:roomCode" element={<AdminRoom />} />
        <Route path="/presentation/:roomCode" element={<PresentationRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
