export interface User {
  id: string;
  profileId: string;
  name: string;
  x: number;
  y: number;
  color: string;
  lobbyRoomId: string;
  roomId: string | null;
  velocity?: { x: number; y: number };
}

export interface PositionUpdate {
  x: number;
  y: number;
  velocity: { x: number; y: number };
}

export interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  roomId: string;
}

export interface GameState {
  users: Map<string, User>;
  currentUserId: string | null;
  roomId: string | null;
  connectedUsers: Set<string>;
  messages: ChatMessage[];
}

export interface WorldBounds {
  width: number;
  height: number;
}

export interface LobbyRoom {
  roomId: string;
  name: string;
  capacity: number;
  occupancy: number;
  isFull: boolean;
}

export interface LobbyUser {
  userId: string;
  profileId: string;
  username: string;
  online: boolean;
  lobbyRoomId: string | null;
}

export interface LobbySnapshot {
  rooms: LobbyRoom[];
  onlineUsers: LobbyUser[];
  onlineCount: number;
}

export interface FriendItem {
  profileId: string;
  username: string;
  online: boolean;
  lobbyRoomId: string | null;
}

export interface IncomingFriendRequest {
  id: string;
  fromProfileId: string;
  fromUsername: string;
  createdAt: string;
}

export interface OutgoingFriendRequest {
  id: string;
  toProfileId: string;
  createdAt: string;
}

export interface FriendSnapshot {
  friends: FriendItem[];
  incoming: IncomingFriendRequest[];
  outgoing: OutgoingFriendRequest[];
}
