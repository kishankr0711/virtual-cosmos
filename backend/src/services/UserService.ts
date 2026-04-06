import { User, UserPublic, PositionUpdate } from '../types/index.js';
import { CONSTANTS } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  private users: Map<string, User> = new Map();

  createUser(params: { profileId: string; name: string; lobbyRoomId: string }): User {
    const color = this.allocateColor();

    const x = Math.random() * (CONSTANTS.WORLD_WIDTH - 100) + 50;
    const floorMinY = Math.min(CONSTANTS.WORLD_HEIGHT - 60, CONSTANTS.WORLD_FLOOR_TOP + 20);
    const floorRange = Math.max(1, CONSTANTS.WORLD_HEIGHT - floorMinY - 50);
    const y = floorMinY + Math.random() * floorRange;
    const id = uuidv4();

    const safeName = params.name.trim().slice(0, CONSTANTS.MAX_NAME_LENGTH) || `${CONSTANTS.DEFAULT_USER_PREFIX}-${id.slice(0, 4)}`;

    const user: User = {
      id,
      profileId: params.profileId,
      name: safeName,
      x,
      y,
      color,
      lobbyRoomId: params.lobbyRoomId,
      roomId: null,
      connections: new Set(),
      lastActive: Date.now(),
      velocity: { x: 0, y: 0 }
    };

    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getAllUsers(): Map<string, User> {
    return this.users;
  }

  getUsersInLobbyRoom(lobbyRoomId: string): User[] {
    return Array.from(this.users.values()).filter((u) => u.lobbyRoomId === lobbyRoomId);
  }

  updatePosition(userId: string, update: PositionUpdate): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.x = Math.max(0, Math.min(CONSTANTS.WORLD_WIDTH, update.x));
    user.y = Math.max(0, Math.min(CONSTANTS.WORLD_HEIGHT, update.y));
    user.velocity = update.velocity;
    user.lastActive = Date.now();

    return true;
  }

  updateName(userId: string, rawName: string): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const name = rawName.trim().slice(0, CONSTANTS.MAX_NAME_LENGTH);
    if (!name) return null;

    user.name = name;
    user.lastActive = Date.now();
    return user;
  }

  touchUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.lastActive = Date.now();
    return true;
  }

  updateConnections(userId: string, connections: string[]): void {
    const user = this.users.get(userId);
    if (!user) return;

    user.connections = new Set(connections);
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  toPublic(user: User): UserPublic {
    return {
      id: user.id,
      profileId: user.profileId,
      name: user.name,
      x: user.x,
      y: user.y,
      color: user.color,
      lobbyRoomId: user.lobbyRoomId,
      roomId: user.roomId
    };
  }

  getAllPublic(): UserPublic[] {
    return Array.from(this.users.values()).map((u) => this.toPublic(u));
  }

  cleanupInactive(): string[] {
    const now = Date.now();
    const removed: string[] = [];

    for (const [userId, user] of this.users) {
      if (now - user.lastActive > CONSTANTS.INACTIVE_TIMEOUT) {
        this.users.delete(userId);
        removed.push(userId);
      }
    }

    return removed;
  }

  private allocateColor(): string {
    const usage = new Map<string, number>();

    for (const color of CONSTANTS.AVATAR_COLORS) {
      usage.set(color, 0);
    }

    for (const user of this.users.values()) {
      usage.set(user.color, (usage.get(user.color) ?? 0) + 1);
    }

    let best: string = CONSTANTS.AVATAR_COLORS[0];
    let bestCount = Number.MAX_SAFE_INTEGER;

    for (const color of CONSTANTS.AVATAR_COLORS) {
      const count = usage.get(color) ?? 0;
      if (count < bestCount) {
        bestCount = count;
        best = color;
      }
    }

    return best;
  }
}
