import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GameApp from './game/GameApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/game" element={<GameApp />} />
        <Route path="*" element={<Navigate to="/game" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
