export const CONSTANTS = {
  PROXIMITY_RADIUS: 150,
  MAX_ROOM_SIZE: 1000,
  GRID_CELL_SIZE: 150,
  WORLD_WIDTH: 1440,
  WORLD_HEIGHT: 860,
  WORLD_FLOOR_TOP: 300,
  POSITION_UPDATE_INTERVAL: 60,
  AVATAR_COLORS: [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FECA57', '#FF9FF3', '#54A0FF', '#48DBFB',
    '#1DD1A1', '#FFC048', '#FF6348', '#30336B'
  ],
  DEFAULT_USER_PREFIX: 'Guest',
  MAX_NAME_LENGTH: 24,
  LOBBY_ROOM_CAPACITY: 1000,
  LOBBY_ROOMS: [
    { roomId: 'room-1', name: 'Room 1' },
    { roomId: 'room-2', name: 'Room 2' },
    { roomId: 'room-3', name: 'Room 3' },
    { roomId: 'room-4', name: 'Room 4' }
  ],
  INACTIVE_TIMEOUT: 600000,
  HEARTBEAT_INTERVAL: 10000,
  CLEANUP_INTERVAL: 10000
} as const;
