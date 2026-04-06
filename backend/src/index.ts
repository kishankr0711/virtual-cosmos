import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import { UserService } from './services/UserService.js';
import { ProximityService } from './services/ProximityService.js';
import { RoomService } from './services/RoomService.js';
import { LobbyService } from './services/LobbyService.js';
import { FriendService } from './services/FriendService.js';
import { SocketHandler } from './handlers/SocketHandler.js';
import { CONSTANTS } from './config/constants.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const userService = new UserService();
const proximityService = new ProximityService();
const roomService = new RoomService();
const lobbyService = new LobbyService(userService);
const friendService = new FriendService();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/lobby', async (req, res) => {
  try {
    const snapshot = await lobbyService.getSnapshot();
    res.json(snapshot);
  } catch (error) {
    const fallbackRooms = CONSTANTS.LOBBY_ROOMS.map((room) => ({
      roomId: room.roomId,
      name: room.name,
      capacity: CONSTANTS.LOBBY_ROOM_CAPACITY,
      occupancy: userService.getUsersInLobbyRoom(room.roomId).length,
      isFull: userService.getUsersInLobbyRoom(room.roomId).length >= CONSTANTS.LOBBY_ROOM_CAPACITY
    }));
    res.json({
      rooms: fallbackRooms,
      onlineUsers: [],
      onlineCount: 0
    });
  }
});

app.get('/api/friends/:profileId', async (req, res) => {
  try {
    const profileId = (req.params.profileId || '').trim();
    if (!profileId) {
      res.status(400).json({ message: 'profileId is required' });
      return;
    }
    const snapshot = await friendService.getSnapshot(profileId);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch friends',
      error: error instanceof Error ? error.message : 'unknown'
    });
  }
});

app.post('/api/friends/request', async (req, res) => {
  try {
    const { fromProfileId, toProfileId } = req.body as { fromProfileId?: string; toProfileId?: string };
    await friendService.sendRequest((fromProfileId || '').trim(), (toProfileId || '').trim());
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Failed to send request'
    });
  }
});

app.post('/api/friends/accept', async (req, res) => {
  try {
    const { requestId, profileId } = req.body as { requestId?: string; profileId?: string };
    await friendService.acceptRequest((requestId || '').trim(), (profileId || '').trim());
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Failed to accept request'
    });
  }
});

new SocketHandler(io, userService, proximityService, roomService, lobbyService);

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await connectDatabase();
  try {
    await lobbyService.seedRooms();
    await lobbyService.syncRoomOccupancy();
  } catch (error) {
    console.warn('Lobby DB seed failed, continuing in degraded mode');
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  });
};

startServer().catch(console.error);
