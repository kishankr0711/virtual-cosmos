import { useEffect, useRef, useCallback, useState } from 'react';
import { PixiEngine } from '../engine/PixiEngine';
import { InputManager } from '../engine/InputManager';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { throttle } from '../utils/throttle';
import type { PositionUpdate } from '../types/index';

const UPDATE_INTERVAL = 60;

export const GameCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PixiEngine | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const users = useGameStore((s) => s.users);
  const connectedUsers = useGameStore((s) => s.connectedUsers);
  const currentUser = useGameStore((s) => s.currentUser);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const worldBounds = useGameStore((s) => s.worldBounds);
  const updateUser = useGameStore((s) => s.updateUser);

  const { sendPosition } = useSocket();

  const throttledSend = useCallback(
    throttle((update: PositionUpdate) => {
      sendPosition(update);
    }, UPDATE_INTERVAL),
    [sendPosition]
  );

  useEffect(() => {
    if (!containerRef.current) {
      setError('Canvas container is not available');
      return;
    }

    let mounted = true;

    const init = async () => {
      const engine = new PixiEngine();
      engineRef.current = engine;

      try {
        await engine.init(containerRef.current!);
        if (!mounted) return;

        const state = useGameStore.getState();
        engine.setWorldBounds(state.worldBounds.width, state.worldBounds.height);

        const input = new InputManager((dx, dy) => {
          const state = useGameStore.getState();
          const local = state.currentUser;
          if (!local) return;

          const newX = Math.max(0, Math.min(state.worldBounds.width, local.x + dx));
          const newY = Math.max(0, Math.min(state.worldBounds.height, local.y + dy));

          if (newX === local.x && newY === local.y) return;

          const vx = dx * 12;
          const vy = dy * 12;

          updateUser({
            ...local,
            x: newX,
            y: newY,
            velocity: { x: vx, y: vy }
          });

          throttledSend({
            x: newX,
            y: newY,
            velocity: { x: vx, y: vy }
          });
        });

        inputRef.current = input;
        setReady(true);

        const handleResize = () => engine.handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (err: any) {
        setError(`Pixi init failed: ${err?.message ?? 'unknown error'}`);
      }
    };

    void init();

    return () => {
      mounted = false;
      inputRef.current?.destroy();
      inputRef.current = null;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [throttledSend, updateUser]);

  useEffect(() => {
    if (ready && engineRef.current) {
      engineRef.current.setWorldBounds(worldBounds.width, worldBounds.height);
    }
  }, [ready, worldBounds.height, worldBounds.width]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!ready || !engine || !currentUser) return;

    const userList = Array.from(users.values());

    engine.setCameraTarget(currentUser.x, currentUser.y);

    for (const user of userList) {
      const isLocal = user.id === currentUserId;
      const isConnected = connectedUsers.has(user.id) || (isLocal && connectedUsers.size > 0);
      engine.updateUser(user, isLocal, isConnected);
    }

    const liveIds = new Set(userList.map((u) => u.id));
    for (const [userId] of engine.userSprites) {
      if (!liveIds.has(userId)) {
        engine.removeUser(userId);
      }
    }

    const connectedPairs = new Set<string>();
    for (const otherId of connectedUsers) {
      connectedPairs.add([currentUser.id, otherId].sort().join('-'));
    }

    engine.updateConnections(userList, connectedPairs);
  }, [users, connectedUsers, currentUser, currentUserId, ready]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 text-white p-6">
        <div>
          <h2 className="text-lg font-semibold">Canvas Error</h2>
          <p className="text-sm opacity-90 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" style={{ background: '#bfdff8' }} />;
};
