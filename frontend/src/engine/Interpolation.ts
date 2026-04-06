import type { User } from '../types';

interface PositionRecord {
  x: number;
  y: number;
  timestamp: number;
  velocity: { x: number; y: number };
}

export class Interpolator {
  private buffer: Map<string, PositionRecord[]> = new Map();
  private readonly bufferSize = 10;
  private readonly renderDelay = 100;

  addPosition(
    userId: string, 
    x: number, 
    y: number, 
    velocity: { x: number; y: number },
    timestamp: number
  ): void {
    if (!this.buffer.has(userId)) {
      this.buffer.set(userId, []);
    }
    
    const positions = this.buffer.get(userId)!;
    positions.push({ x, y, timestamp, velocity });
    
    if (positions.length > this.bufferSize) {
      positions.shift();
    }
  }
  
  getPosition(userId: string, currentTime: number): { x: number; y: number } | null {
    const positions = this.buffer.get(userId);
    if (!positions || positions.length < 2) return null;
    
    const renderTime = currentTime - this.renderDelay;
    
    for (let i = 0; i < positions.length - 1; i++) {
      const prev = positions[i];
      const next = positions[i + 1];
      
      if (prev.timestamp <= renderTime && next.timestamp >= renderTime) {
        const t = (renderTime - prev.timestamp) / (next.timestamp - prev.timestamp);
        return {
          x: prev.x + (next.x - prev.x) * t,
          y: prev.y + (next.y - prev.y) * t
        };
      }
    }
    
    const latest = positions[positions.length - 1];
    return { x: latest.x, y: latest.y };
  }
  
  predict(user: User, deltaTime: number): { x: number; y: number } {
    if (!user.velocity) return { x: user.x, y: user.y };
    
    return {
      x: user.x + user.velocity.x * deltaTime,
      y: user.y + user.velocity.y * deltaTime
    };
  }
  
  removeUser(userId: string): void {
    this.buffer.delete(userId);
  }
}