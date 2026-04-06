import { Server, Socket } from 'socket.io';
import { UserService } from '../services/UserService.js';
import { ProximityService } from '../services/ProximityService.js';
import { RoomService } from '../services/RoomService.js';
import { LobbyService } from '../services/LobbyService.js';
import { PositionUpdate, ChatMessage, JoinWorldPayload } from '../types/index.js';
import { CONSTANTS } from '../config/constants.js';

type SocketWithUser = Socket & { data: { userId?: string } };

export class SocketHandler {
  private io: Server;
  private userService: UserService;
  private proximityService: ProximityService;
  private roomService: RoomService;
  private lobbyService: LobbyService;

  private lastUpdateTime: Map<string, number> = new Map();
  private lastKnownRoomByUser: Map<string, string | null> = new Map();

  constructor(
    io: Server,
    userService: UserService,
    proximityService: ProximityService,
    roomService: RoomService,
    lobbyService: LobbyService
  ) {
    this.io = io;
    this.userService = userService;
    this.proximityService = proximityService;
    this.roomService = roomService;
    this.lobbyService = lobbyService;

    this.setupHandlers();
    this.startGameLoop();
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket: SocketWithUser) => {
      socket.on('joinWorld', async (payload: JoinWorldPayload) => {
        await this.handleJoinWorld(socket, payload);
      });

      socket.on('positionUpdate', (update: PositionUpdate) => {
        const userId = socket.data.userId;
        if (!userId) return;
        this.handlePositionUpdate(userId, update);
      });

      socket.on('setName', async (payload: { name?: string }) => {
        const userId = socket.data.userId;
        if (!userId) return;
        await this.handleSetName(userId, payload?.name ?? '');
      });

      socket.on('chatMessage', (message: string) => {
        const userId = socket.data.userId;
        if (!userId) return;
        this.handleChatMessage(userId, message);
      });

      socket.on('heartbeat', () => {
        const userId = socket.data.userId;
        if (!userId) return;
        this.userService.touchUser(userId);
      });

      socket.on('disconnect', async () => {
        const userId = socket.data.userId;
        if (!userId) return;
        await this.handleDisconnect(userId);
      });
    });
  }

  private async handleJoinWorld(socket: SocketWithUser, payload: JoinWorldPayload): Promise<void> {
    let createdUserId: string | null = null;

    try {
      const profileId = (payload.profileId || '').trim();
      const lobbyRoomId = (payload.lobbyRoomId || '').trim();
      const name = (payload.name || '').trim();

      if (!profileId || !lobbyRoomId || !name) {
        socket.emit('joinRejected', { reason: 'Invalid join payload' });
        return;
      }

      const user = this.userService.createUser({ profileId, name, lobbyRoomId });
      createdUserId = user.id;
      socket.data.userId = user.id;

      this.proximityService.updateUserPosition(user);
      this.lastKnownRoomByUser.set(user.id, null);

      await this.lobbyService.markUserOnline({
        profileId,
        userId: user.id,
        username: user.name,
        lobbyRoomId
      });
      await this.lobbyService.syncRoomOccupancy();

      const usersInRoom = this.userService
        .getUsersInLobbyRoom(lobbyRoomId)
        .map((u) => this.userService.toPublic(u));

      socket.emit('init', {
        userId: user.id,
        users: usersInRoom,
        worldBounds: {
          width: CONSTANTS.WORLD_WIDTH,
          height: CONSTANTS.WORLD_HEIGHT
        }
      });

      socket
        .broadcast
        .emit('userJoined', this.userService.toPublic(user));
    } catch (error) {
      if (createdUserId) {
        const user = this.userService.getUser(createdUserId);
        if (user) {
          this.proximityService.removeUser(user);
        }
        this.userService.removeUser(createdUserId);
        this.lastKnownRoomByUser.delete(createdUserId);
        this.lastUpdateTime.delete(createdUserId);
      }

      socket.data.userId = undefined;
      socket.emit('joinRejected', { reason: 'Failed to join room. Please retry.' });
      console.error('handleJoinWorld failed:', error);
    }
  }

  private handlePositionUpdate(userId: string, update: PositionUpdate): void {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(userId) || 0;

    if (now - lastUpdate < CONSTANTS.POSITION_UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTime.set(userId, now);

    const user = this.userService.getUser(userId);
    if (!user) return;

    const oldX = user.x;
    const oldY = user.y;

    if (this.userService.updatePosition(userId, update)) {
      this.proximityService.updateUserPosition(user, oldX, oldY);

      this.broadcastToNearby(user, {
        userId,
        x: update.x,
        y: update.y,
        velocity: update.velocity,
        timestamp: now
      });
    }
  }

  private broadcastToNearby(user: { id: string; x: number; y: number }, data: any): void {
    const nearbySockets = this.getNearbySockets(user.id);

    for (const socket of nearbySockets) {
      socket.emit('userMoved', data);
    }
  }

  private getNearbySockets(centerUserId: string): SocketWithUser[] {
    const sockets: SocketWithUser[] = [];
    const allUsers = this.userService.getAllUsers();
    const centerUser = this.userService.getUser(centerUserId);
    if (!centerUser) return sockets;

    const nearbyIds = this.proximityService.findNearbyUsers(centerUser, allUsers);
    const visibleIds = new Set([centerUser.id, ...nearbyIds]);

    for (const [, socket] of this.io.sockets.sockets as Map<string, SocketWithUser>) {
      const userId = socket.data.userId;
      if (!userId) continue;
      const user = this.userService.getUser(userId);
      if (!user) continue;
      if (user.lobbyRoomId !== centerUser.lobbyRoomId) continue;

      if (visibleIds.has(userId)) {
        sockets.push(socket);
      }
    }

    return sockets;
  }

  private async handleSetName(userId: string, name: string): Promise<void> {
    const updated = this.userService.updateName(userId, name);
    if (!updated) return;

    await this.lobbyService.updateUserName(updated.profileId, updated.name);

    const publicUser = this.userService.toPublic(updated);
    this.io.emit('userUpdated', publicUser);
  }

  private handleChatMessage(userId: string, message: string): void {
    const user = this.userService.getUser(userId);
    if (!user || !user.roomId) return;
    this.userService.touchUser(userId);

    const sanitized = message.trim().slice(0, 200);
    if (!sanitized) return;

    const chatMessage: ChatMessage = {
      userId,
      userName: user.name,
      message: sanitized,
      timestamp: Date.now(),
      roomId: user.roomId
    };

    this.io.to(user.roomId).emit('chatMessage', chatMessage);
  }

  private async handleDisconnect(userId: string): Promise<void> {
    const user = this.userService.getUser(userId);
    if (user) {
      this.proximityService.removeUser(user);
      this.userService.removeUser(userId);
      this.lastKnownRoomByUser.delete(userId);
      this.lastUpdateTime.delete(userId);
      await this.lobbyService.markUserOffline(userId);
      await this.lobbyService.syncRoomOccupancy();
      this.io.emit('userLeft', userId);
    }
  }

  private startGameLoop(): void {
    setInterval(() => {
      this.updateProximityAndRooms();
    }, 100);

    setInterval(async () => {
      const removed = this.userService.cleanupInactive();
      for (const userId of removed) {
        this.io.emit('userLeft', userId);
        this.lastKnownRoomByUser.delete(userId);
        this.lastUpdateTime.delete(userId);
        await this.lobbyService.markUserOffline(userId);
      }
      await this.lobbyService.syncRoomOccupancy();
      this.proximityService.cleanup();
      this.roomService.cleanup();
    }, CONSTANTS.CLEANUP_INTERVAL);
  }

  private updateProximityAndRooms(): void {
    const users = this.userService.getAllUsers();
    const allUsers = Array.from(users.values());

    const connectionChanges: Array<{
      userId: string;
      connected: string[];
      disconnected: string[];
    }> = [];

    for (const user of allUsers) {
      const oldConnections = new Set(user.connections);
      const newConnections = this.proximityService.findNearbyUsers(user, users);

      const connected = newConnections.filter((id) => !oldConnections.has(id));
      const disconnected = Array.from(oldConnections).filter((id) => !newConnections.includes(id));

      if (connected.length > 0 || disconnected.length > 0) {
        connectionChanges.push({ userId: user.id, connected, disconnected });
        this.userService.updateConnections(user.id, newConnections);
      }
    }

    this.roomService.assignRooms(users);

    for (const change of connectionChanges) {
      const user = users.get(change.userId);
      if (!user) continue;

      for (const otherId of change.connected) {
        const other = users.get(otherId);
        if (other) {
          this.emitToUser(change.userId, 'userConnected', { userId: otherId, color: other.color });
          this.emitToUser(otherId, 'userConnected', { userId: change.userId, color: user.color });
        }
      }

      for (const otherId of change.disconnected) {
        this.emitToUser(change.userId, 'userDisconnected', { userId: otherId });
        this.emitToUser(otherId, 'userDisconnected', { userId: change.userId });
      }
    }

    for (const user of allUsers) {
      const socket = this.getSocketByUserId(user.id);
      if (!socket) continue;

      const prevRoom = this.lastKnownRoomByUser.get(user.id) ?? null;
      const currentRoom = user.roomId;

      if (prevRoom && prevRoom !== currentRoom) {
        socket.leave(prevRoom);
      }

      if (currentRoom) {
        socket.join(currentRoom);
        socket.emit('roomJoined', {
          roomId: currentRoom,
          members: this.roomService.getRoomUsers(currentRoom)
        });
      } else if (prevRoom) {
        socket.emit('roomLeft', {});
      }

      this.lastKnownRoomByUser.set(user.id, currentRoom);
    }
  }

  private emitToUser(userId: string, event: string, data: any): void {
    const socket = this.getSocketByUserId(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  private getSocketByUserId(userId: string): SocketWithUser | null {
    for (const [, socket] of this.io.sockets.sockets as Map<string, SocketWithUser>) {
      if (socket.data.userId === userId) {
        return socket;
      }
    }
    return null;
  }
}
