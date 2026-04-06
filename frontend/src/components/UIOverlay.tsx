import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

interface UIOverlayProps {
  onSwitchRoom: () => void;
  onEndSession: () => void;
  isReady: boolean;
}

export const UIOverlay = ({ onSwitchRoom, onEndSession, isReady }: UIOverlayProps) => {
  const store = useGameStore();
  const currentUser = store.currentUser;
  const { setName } = useSocket();

  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (currentUser?.name) {
      setNameInput(currentUser.name);
    }
  }, [currentUser?.name]);

  const playersInLobbyRoom = useMemo(() => {
    if (!currentUser) return 0;
    let count = 0;
    for (const user of store.users.values()) {
      if (user.lobbyRoomId === currentUser.lobbyRoomId) count++;
    }
    return count;
  }, [currentUser, store.users]);

  const submitName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !currentUser) return;
    setName(trimmed);
  };

  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute top-0 left-0 right-0 min-h-14 bg-[#0a0a26]/95 border-b border-indigo-900/60 pointer-events-auto">
        <div className="h-full px-3 py-2 md:px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-400" />
            <span className="font-semibold tracking-wide">{currentUser?.lobbyRoomId ?? 'Room'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
              {playersInLobbyRoom} players
            </span>
            <button
              onClick={onSwitchRoom}
              className="px-3 py-1 rounded bg-amber-500 text-black font-semibold pointer-events-auto"
            >
              Switch
            </button>
            <button
              onClick={onEndSession}
              className="px-3 py-1 rounded bg-rose-600 text-white font-semibold pointer-events-auto"
            >
              End
            </button>
          </div>
        </div>
      </div>

      <div className="absolute top-20 md:top-16 left-3 md:left-4 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700 p-4 pointer-events-auto w-[calc(100vw-1.5rem)] max-w-xs">
        <h1 className="text-xl font-bold text-white mb-2">Virtual Cosmos</h1>

        {currentUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: currentUser.color }} />
              <span className="text-gray-200 text-sm font-medium">{currentUser.name}</span>
            </div>

            <div className="flex gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={submitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitName();
                  }
                }}
                maxLength={24}
                className="flex-1 bg-gray-800 text-gray-100 text-xs rounded-md px-2 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none"
                placeholder="Write your name"
              />
              <button
                onClick={submitName}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 py-1.5 rounded-md"
              >
                Save
              </button>
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p>Position: ({Math.round(currentUser.x)}, {Math.round(currentUser.y)})</p>
              <p>Status: {store.roomId ? <span className="text-green-400">In proximity chat</span> : <span className="text-yellow-400">Exploring</span>}</p>
              <p>Nearby: {store.connectedUsers.size} users</p>
            </div>
          </div>
        )}
      </div>

      {!isReady && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="px-5 py-3 rounded-xl bg-black/50 text-white text-sm">Joining room...</div>
        </div>
      )}
    </div>
  );
};
