import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

const DESKTOP_MAP_SIZE = 160;
const MOBILE_MAP_SIZE = 120;

export const MiniMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapSize, setMapSize] = useState(() =>
    window.innerWidth < 640 ? MOBILE_MAP_SIZE : DESKTOP_MAP_SIZE
  );
  const store = useGameStore();

  useEffect(() => {
    const onResize = () => {
      setMapSize(window.innerWidth < 640 ? MOBILE_MAP_SIZE : DESKTOP_MAP_SIZE);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { worldBounds, users, currentUserId } = store;
    const topZoneHeight = worldBounds.height * 0.43;

    ctx.fillStyle = '#b7865a';
    ctx.fillRect(0, 0, mapSize, mapSize);

    ctx.strokeStyle = '#6f4428';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, mapSize, mapSize);

    const scaleX = mapSize / worldBounds.width;
    const scaleY = mapSize / worldBounds.height;

    // Top split rooms.
    ctx.fillStyle = '#c9b391';
    ctx.fillRect(0, 0, mapSize / 2, topZoneHeight * scaleY);
    ctx.fillStyle = '#bda276';
    ctx.fillRect(mapSize / 2, 0, mapSize / 2, topZoneHeight * scaleY);
    ctx.fillStyle = '#7f4f38';
    ctx.fillRect(mapSize / 2 - 1.5, 0, 3, topZoneHeight * scaleY);
    ctx.fillStyle = '#8b5a3d';
    ctx.fillRect(0, topZoneHeight * scaleY - 2, mapSize, 2);

    const roomGroups = new Map<string, Array<{ x: number; y: number }>>();
    for (const user of users.values()) {
      if (!user.roomId) continue;
      const list = roomGroups.get(user.roomId) ?? [];
      list.push({ x: user.x, y: user.y });
      roomGroups.set(user.roomId, list);
    }

    for (const members of roomGroups.values()) {
      const cx = members.reduce((sum, p) => sum + p.x, 0) / members.length;
      const cy = members.reduce((sum, p) => sum + p.y, 0) / members.length;
      const radius = Math.max(10, Math.min(24, 6 + members.length * 4));

      ctx.beginPath();
      ctx.arc(cx * scaleX, cy * scaleY, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.17)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const user of users.values()) {
      const x = user.x * scaleX;
      const y = user.y * scaleY;
      const isCurrent = user.id === currentUserId;
      const isConnected = store.connectedUsers.has(user.id);

      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = user.color;
      ctx.fill();

      if (isCurrent) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (isConnected) {
        ctx.beginPath();
        ctx.arc(x, y, 6.8, 0, Math.PI * 2);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [store.users, store.connectedUsers, store.worldBounds, store.roomId, store.currentUserId, mapSize]);

  return (
    <div className="fixed top-[21.25rem] md:top-[19.75rem] left-3 md:left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 p-2 shadow-lg z-20">
      <canvas ref={canvasRef} width={mapSize} height={mapSize} className="rounded" />
      <div className="mt-2 text-xs text-gray-400 text-center">{store.users.size} users online</div>
    </div>
  );
};
