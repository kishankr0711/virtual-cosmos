//user representation in the system
export interface User {
  id: string;
  profileId: string;
  name: string;
  x: number;
  y: number;
  color: string;
  lobbyRoomId: string;
  roomId: string | null;
  connections: Set<string>;
  lastActive: number;
  velocity: { x: number; y: number };
}

export interface UserPublic {
  id: string;
  profileId: string;
  name: string;
  x: number;
  y: number;
  color: string;
  lobbyRoomId: string;
  roomId: string | null;
}

export interface Room {
  id: string;
  userIds: Set<string>;
  maxUsers: number;
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

export interface GridCell {
  users: Set<string>;
}

export interface JoinWorldPayload {
  profileId: string;
  name: string;
  lobbyRoomId: string;
}
