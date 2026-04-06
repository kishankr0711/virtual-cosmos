import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { PositionUpdate, ChatMessage, User } from '../types/index';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let globalSocket: Socket | null = null;
let listenersAttached = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const startHeartbeat = () => {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (globalSocket?.connected) {
      globalSocket.emit('heartbeat');
    }
  }, 10000);
};

const stopHeartbeat = () => {
  if (!heartbeatTimer) return;
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

const playSound = (type: 'connect' | 'disconnect') => {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'connect') {
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.22);
    } else {
      oscillator.frequency.setValueAtTime(390, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(230, ctx.currentTime + 0.12);
      gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // noop
  }
};

const attachListeners = (socket: Socket) => {
  if (listenersAttached) return;
  listenersAttached = true;

  socket.on('init', (data: {
    userId: string;
    users: User[];
    worldBounds: { width: number; height: number };
  }) => {
    const store = useGameStore.getState();
    store.setCurrentUser(data.userId, data.users);
    store.setWorldBounds(data.worldBounds);
  });

  socket.on('joinRejected', (payload: { reason: string }) => {
    window.alert(payload.reason || 'Unable to join room');
    window.dispatchEvent(new CustomEvent('cosmos:joinRejected'));
  });

  socket.on('userJoined', (user: User) => {
    const current = useGameStore.getState().currentUser;
    if (current && current.lobbyRoomId === user.lobbyRoomId) {
      useGameStore.getState().updateUser(user);
    }
  });

  socket.on('userUpdated', (user: User) => {
    useGameStore.getState().updateUser(user);
  });

  socket.on('userLeft', (userId: string) => {
    useGameStore.getState().removeUser(userId);
  });

  socket.on('userMoved', (data: {
    userId: string;
    x: number;
    y: number;
    velocity: { x: number; y: number };
    timestamp: number;
  }) => {
    const store = useGameStore.getState();
    const user = store.users.get(data.userId);
    if (!user) return;

    store.updateUser({
      ...user,
      x: data.x,
      y: data.y,
      velocity: data.velocity
    });
  });

  socket.on('userConnected', ({ userId }: { userId: string; color: string }) => {
    useGameStore.getState().addConnection(userId);
    playSound('connect');
  });

  socket.on('userDisconnected', ({ userId }: { userId: string }) => {
    useGameStore.getState().removeConnection(userId);
    playSound('disconnect');
  });

  socket.on('roomJoined', (data: { roomId: string; members: string[] }) => {
    useGameStore.getState().setRoom(data.roomId, data.members);
  });

  socket.on('roomLeft', () => {
    useGameStore.getState().setRoom(null, []);
  });

  socket.on('chatMessage', (message: ChatMessage) => {
    useGameStore.getState().addMessage(message);
  });
};

export const initSocket = (params: { profileId: string; name: string; lobbyRoomId: string }) => {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 700,
      reconnectionDelayMax: 5000
    });

    globalSocket.on('connect', () => {
      globalSocket?.emit('joinWorld', params);
      startHeartbeat();
    });

    globalSocket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      stopHeartbeat();
    });

    globalSocket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });
  } else if (globalSocket.connected) {
    globalSocket.emit('joinWorld', params);
    startHeartbeat();
  }

  attachListeners(globalSocket);
  return globalSocket;
};

export const disconnectSocket = () => {
  if (globalSocket) {
    stopHeartbeat();
    globalSocket.disconnect();
    globalSocket = null;
    listenersAttached = false;
  }
};

export const useSocket = () => {
  const sendPosition = useCallback((update: PositionUpdate) => {
    globalSocket?.emit('positionUpdate', update);
  }, []);

  const sendMessage = useCallback((message: string) => {
    globalSocket?.emit('chatMessage', message);
  }, []);

  const setName = useCallback((name: string) => {
    globalSocket?.emit('setName', { name });
  }, []);

  return {
    socket: globalSocket,
    sendPosition,
    sendMessage,
    setName
  };
};
