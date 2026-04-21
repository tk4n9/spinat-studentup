import { useEffect } from 'react';
import { useSessionStore } from './store/sessionStore';
import StartScreen from './screens/StartScreen';
import CountdownScreen from './screens/CountdownScreen';
import RecordingScreen from './screens/RecordingScreen';
import ReviewScreen from './screens/ReviewScreen';
import QRCodeScreen from './screens/QRCodeScreen';
import RestartScreen from './screens/RestartScreen';

export default function PadApp() {
  const screen = useSessionStore((s) => s.screen);

  // Block browser back button (kiosk mode)
  useEffect(() => {
    const block = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', block);
    return () => window.removeEventListener('popstate', block);
  }, []);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden font-sans">
      {screen === 'START'      && <StartScreen />}
      {screen === 'COUNTDOWN'  && <CountdownScreen />}
      {screen === 'RECORDING'  && <RecordingScreen />}
      {screen === 'REVIEW'     && <ReviewScreen />}
      {screen === 'QR_CODE'    && <QRCodeScreen />}
      {screen === 'RESTART'    && <RestartScreen />}
    </div>
  );
}
