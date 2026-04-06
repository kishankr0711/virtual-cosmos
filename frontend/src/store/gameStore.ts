import { create } from 'zustand';
import type { User, ChatMessage, WorldBounds } from '../types/index';

interface GameStore {
  // Users
  users: Map<string, User>;
  currentUserId: string | null;
  currentUser: User | null;

  // Room state
  roomId: string | null;
  roomMembers: string[];

  // Proximity
  connectedUsers: Set<string>;

  // Chat
  messages: ChatMessage[];
  isChatOpen: boolean;

  // World
  worldBounds: WorldBounds;

  // Actions
  setCurrentUser: (userId: string, users: User[]) => void;
  updateUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setRoom: (roomId: string | null, members: string[]) => void;
  addConnection: (userId: string) => void;
  removeConnection: (userId: string) => void;
  addMessage: (message: ChatMessage) => void;
  setChatOpen: (open: boolean) => void;
  setWorldBounds: (bounds: WorldBounds) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  users: new Map(),
  currentUserId: null,
  currentUser: null,
  roomId: null,
  roomMembers: [],
  connectedUsers: new Set(),
  messages: [],
  isChatOpen: false,
  worldBounds: { width: 1440, height: 860 },

  setCurrentUser: (userId, usersArray) => {
    const users = new Map(usersArray.map((u) => [u.id, u]));
    const currentUser = users.get(userId) || null;
    set({
      users,
      currentUserId: userId,
      currentUser,
      connectedUsers: new Set()
    });
  },

  updateUser: (user) => {
    const users = new Map(get().users);
    users.set(user.id, user);

    const currentUserId = get().currentUserId;
    const nextCurrent = currentUserId ? users.get(currentUserId) || null : null;

    set({ users, currentUser: nextCurrent });
  },

  removeUser: (userId) => {
    const users = new Map(get().users);
    users.delete(userId);

    const connectedUsers = new Set(get().connectedUsers);
    connectedUsers.delete(userId);

    const currentUserId = get().currentUserId;
    const nextCurrent = currentUserId ? users.get(currentUserId) || null : null;

    set({ users, connectedUsers, currentUser: nextCurrent });
  },

  setRoom: (roomId, members) => {
    const wasInRoom = Boolean(get().roomId);
    const nowInRoom = Boolean(roomId);

    set({
      roomId,
      roomMembers: members,
      isChatOpen: nowInRoom,
      messages: nowInRoom || wasInRoom ? get().messages : []
    });
  },

  addConnection: (userId) => {
    const connectedUsers = new Set(get().connectedUsers);
    connectedUsers.add(userId);
    set({ connectedUsers });
  },

  removeConnection: (userId) => {
    const connectedUsers = new Set(get().connectedUsers);
    connectedUsers.delete(userId);
    set({ connectedUsers });
  },

  addMessage: (message) => {
    set({ messages: [...get().messages, message] });
  },

  setChatOpen: (open) => set({ isChatOpen: open }),

  setWorldBounds: (bounds) => set({ worldBounds: bounds }),

  reset: () => set({
    users: new Map(),
    currentUserId: null,
    currentUser: null,
    roomId: null,
    roomMembers: [],
    connectedUsers: new Set(),
    messages: [],
    isChatOpen: false,
    worldBounds: { width: 1440, height: 860 }
  })
}));
