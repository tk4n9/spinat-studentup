import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PadApp from './pad/PadApp';
import MonitorApp from './monitor/MonitorApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pad" element={<PadApp />} />
        <Route path="/monitor" element={<MonitorApp />} />
        {/* Default: redirect to /pad (useful during dev) */}
        <Route path="*" element={<Navigate to="/pad" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
