import { Room, User } from '../types/index.js';
import { CONSTANTS } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

// dynamic room management
export class RoomService {
  private rooms: Map<string, Room> = new Map();
  private userRoomMap: Map<string, string> = new Map(); // userId -> roomId

  // assign room connection
  assignRooms(users: Map<string, User>): Map<string, string> {
    const assignments = new Map<string, string>();
    const processed = new Set<string>();

    const clusters: string[][] = [];

    for (const [userId] of users) {
      if (processed.has(userId)) continue;

      const cluster: string[] = [];
      const queue = [userId];
      processed.add(userId);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        cluster.push(currentId);

        const currentUser = users.get(currentId);
        if (!currentUser) continue;

        for (const connectedId of currentUser.connections) {
          if (!processed.has(connectedId) && users.has(connectedId)) {
            processed.add(connectedId);
            queue.push(connectedId);
          }
        }
      }

      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }

    for (const room of this.rooms.values()) {
      room.userIds.clear();
    }

    for (const cluster of clusters) {
      const sorted = this.stableSortByPreviousRoom(cluster);

      for (let i = 0; i < sorted.length; i += CONSTANTS.MAX_ROOM_SIZE) {
        const chunk = sorted.slice(i, i + CONSTANTS.MAX_ROOM_SIZE);
        const roomId = this.pickRoomForChunk(chunk);
        const room = this.getOrCreateRoom(roomId);

        for (const userId of chunk) {
          assignments.set(userId, room.id);
          room.userIds.add(userId);
        }
      }
    }

    for (const [userId, user] of users) {
      const roomId = assignments.get(userId) ?? null;
      user.roomId = roomId;

      if (roomId) {
        this.userRoomMap.set(userId, roomId);
      } else {
        this.userRoomMap.delete(userId);
      }
    }

    for (const [roomId, room] of this.rooms) {
      if (room.userIds.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    return assignments;
  }

  getUserRoom(userId: string): string | null {
    return this.userRoomMap.get(userId) || null;
  }

  getRoomUsers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.userIds) : [];
  }

  cleanup(): void {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.userIds.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  private stableSortByPreviousRoom(cluster: string[]): string[] {
    return [...cluster].sort((a, b) => {
      const roomA = this.userRoomMap.get(a) ?? '';
      const roomB = this.userRoomMap.get(b) ?? '';
      if (roomA === roomB) return a.localeCompare(b);
      return roomA.localeCompare(roomB);
    });
  }

  private pickRoomForChunk(chunk: string[]): string {
    const previousRoomIds = new Set(
      chunk
        .map((id) => this.userRoomMap.get(id))
        .filter((roomId): roomId is string => Boolean(roomId))
    );

    if (previousRoomIds.size === 1) {
      return Array.from(previousRoomIds)[0];
    }

    return uuidv4();
  }

  private getOrCreateRoom(roomId: string): Room {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const room: Room = {
      id: roomId,
      userIds: new Set(),
      maxUsers: CONSTANTS.MAX_ROOM_SIZE
    };

    this.rooms.set(roomId, room);
    return room;
  }
}
