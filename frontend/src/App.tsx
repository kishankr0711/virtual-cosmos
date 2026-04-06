import { useEffect, useMemo, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ChatPanel } from './components/ChatPanel';
import { MiniMap } from './components/MiniMap';
import { UIOverlay } from './components/UIOverlay';
import { LobbyMenu } from './components/LobbyMenu';
import { disconnectSocket, initSocket } from './hooks/useSocket';
import { useGameStore } from './store/gameStore';
import './index.css';

type JoinPayload = { profileId: string; name: string; lobbyRoomId: string };

function App() {
  const [session, setSession] = useState<JoinPayload | null>(null);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const resetStore = useGameStore((s) => s.reset);

  useEffect(() => {
    if (!session) return;
    initSocket(session);
  }, [session]);

  useEffect(() => {
    if (!session || currentUserId) return;

    const timer = setTimeout(() => {
      disconnectSocket();
      resetStore();
      setSession(null);
      window.alert('Join timed out. Please try again.');
    }, 10000);

    return () => clearTimeout(timer);
  }, [session, currentUserId, resetStore]);

  useEffect(() => {
    const onRejected = () => {
      disconnectSocket();
      resetStore();
      setSession(null);
    };

    window.addEventListener('cosmos:joinRejected', onRejected);
    return () => window.removeEventListener('cosmos:joinRejected', onRejected);
  }, [resetStore]);

  const isInWorld = useMemo(() => Boolean(session && currentUserId), [session, currentUserId]);

  const leaveWorld = () => {
    disconnectSocket();
    resetStore();
    setSession(null);
  };

  if (!session) {
    return <LobbyMenu onJoin={setSession} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#bfdff8]">
      <GameCanvas />
      <UIOverlay onSwitchRoom={leaveWorld} onEndSession={leaveWorld} isReady={isInWorld} />
      <MiniMap />
      <ChatPanel />
    </div>
  );
}

export default App;
