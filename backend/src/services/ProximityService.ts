import { User, GridCell } from '../types/index.js';
import { CONSTANTS } from '../config/constants.js';

/**
 optimized proximity detection using spatial hashing grid
  instead of O(n²) checking all users against each other
 **/
export class ProximityService {
  private grid: Map<string, GridCell> = new Map();
  private cellSize: number = CONSTANTS.GRID_CELL_SIZE;
  
  // grid cell
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  // 3x3grid
  private getNeighborKeys(x: number, y: number): string[] {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const keys: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        keys.push(`${cellX + dx},${cellY + dy}`);
      }
    }
    return keys;
  }
  
  //update user position
  updateUserPosition(user: User, oldX?: number, oldY?: number): void {
    if (oldX !== undefined && oldY !== undefined) {
      const oldKey = this.getCellKey(oldX, oldY);
      const oldCell = this.grid.get(oldKey);
      if (oldCell) {
        oldCell.users.delete(user.id);
        if (oldCell.users.size === 0) {
          this.grid.delete(oldKey);
        }
      }
    }
    const newKey = this.getCellKey(user.x, user.y);
    if (!this.grid.has(newKey)) {
      this.grid.set(newKey, { users: new Set() });
    }
    this.grid.get(newKey)!.users.add(user.id);
  }
  //remove user
  removeUser(user: User): void {
    const key = this.getCellKey(user.x, user.y);
    const cell = this.grid.get(key);
    if (cell) {
      cell.users.delete(user.id);
      if (cell.users.size === 0) {
        this.grid.delete(key);
      }
    }
  }
  
  // find user
  findNearbyUsers(user: User, allUsers: Map<string, User>): string[] {
    const nearby: string[] = [];
    const neighborKeys = this.getNeighborKeys(user.x, user.y);
    
    for (const key of neighborKeys) {
      const cell = this.grid.get(key);
      if (!cell) continue;
      
      for (const otherId of cell.users) {
        if (otherId === user.id) continue;
        
        const other = allUsers.get(otherId);
        if (!other) continue;
        if (other.lobbyRoomId !== user.lobbyRoomId) continue;
        
        const distance = this.calculateDistance(user, other);
        if (distance < CONSTANTS.PROXIMITY_RADIUS) {
          nearby.push(otherId);
        }
      }
    }
    
    return nearby;
  }
  
  private calculateDistance(a: User, b: User): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  cleanup(): void {
    for (const [key, cell] of this.grid.entries()) {
      if (cell.users.size === 0) {
        this.grid.delete(key);
      }
    }
  }
}
