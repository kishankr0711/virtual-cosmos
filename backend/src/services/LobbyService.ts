import { RoomModel } from '../models/Room.js';
import { UserModel } from '../models/User.js';
import { CONSTANTS } from '../config/constants.js';
import { UserService } from './UserService.js';

export class LobbyService {
  constructor(private userService: UserService) {}

  async seedRooms(): Promise<void> {
    for (const room of CONSTANTS.LOBBY_ROOMS) {
      await RoomModel.updateOne(
        { roomId: room.roomId },
        {
          $setOnInsert: {
            roomId: room.roomId,
            name: room.name,
            capacity: CONSTANTS.LOBBY_ROOM_CAPACITY,
            occupancy: 0,
            isActive: true
          }
        },
        { upsert: true }
      );
    }
  }

  async getSnapshot() {
    const rooms = await RoomModel.find({ isActive: true }).sort({ roomId: 1 }).lean();
    const onlineUsers = await UserModel.find({ online: true })
      .select({ userId: 1, profileId: 1, username: 1, online: 1, lobbyRoomId: 1, _id: 0 })
      .lean();

    return {
      rooms: rooms.map((room) => ({
        roomId: room.roomId,
        name: room.name,
        capacity: room.capacity,
        occupancy: room.occupancy,
        isFull: false
      })),
      onlineUsers,
      onlineCount: onlineUsers.length
    };
  }

  async syncRoomOccupancy(): Promise<void> {
    for (const room of CONSTANTS.LOBBY_ROOMS) {
      const occupancy = this.userService.getUsersInLobbyRoom(room.roomId).length;
      await RoomModel.updateOne(
        { roomId: room.roomId },
        { $set: { occupancy } },
        { upsert: true }
      );
    }
  }

  async markUserOnline(params: { profileId: string; userId: string; username: string; lobbyRoomId: string }): Promise<void> {
    await UserModel.updateOne(
      { profileId: params.profileId },
      {
        $set: {
          userId: params.userId,
          username: params.username,
          online: true,
          lobbyRoomId: params.lobbyRoomId,
          lastLogin: new Date(),
          lastSeenAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
          'stats.totalTimeOnline': 0,
          'stats.roomsJoined': 0,
          'stats.messagesSent': 0
        }
      },
      { upsert: true }
    );

    await UserModel.updateOne(
      { profileId: params.profileId },
      {
        $inc: {
          'stats.roomsJoined': 1
        }
      }
    );
  }

  async markUserOffline(userId: string): Promise<void> {
    await UserModel.updateOne(
      { userId },
      {
        $set: {
          online: false,
          lobbyRoomId: null,
          lastSeenAt: new Date()
        }
      }
    );
  }

  async updateUserName(profileId: string, name: string): Promise<void> {
    await UserModel.updateOne(
      { profileId },
      {
        $set: {
          username: name,
          lastSeenAt: new Date()
        }
      }
    );
  }

  async roomHasCapacity(roomId: string): Promise<boolean> {
    const room = await RoomModel.findOne({ roomId, isActive: true }).lean();
    if (!room) return false;

    const activeCount = this.userService.getUsersInLobbyRoom(roomId).length;
    return activeCount < room.capacity;
  }
}
