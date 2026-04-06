import { User, GridCell } from '../types/index.js';
import { CONSTANTS } from '../config/constants.js';

/**
 * Optimized proximity detection using Spatial Hashing Grid
 * 
 * Instead of O(n²) checking all users against each other,
 * we divide the world into grid cells and only check
 * users in the same or adjacent cells.
 * 
 * Time Complexity: O(n) average case
 * Space Complexity: O(n)
 */
export class ProximityService {
  private grid: Map<string, GridCell> = new Map();
  private cellSize: number = CONSTANTS.GRID_CELL_SIZE;
  
  /**
   * Convert world coordinates to grid cell key
   */
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  /**
   * Get all neighboring cell keys (including current cell)
   * We check 3x3 grid around the user for proximity
   */
  private getNeighborKeys(x: number, y: number): string[] {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const keys: string[] = [];
    
    // Check 3x3 grid around current position
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        keys.push(`${cellX + dx},${cellY + dy}`);
      }
    }
    return keys;
  }
  
  /**
   * Update user's position in the spatial grid
   */
  updateUserPosition(user: User, oldX?: number, oldY?: number): void {
    // Remove from old cell if position changed
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
    
    // Add to new cell
    const newKey = this.getCellKey(user.x, user.y);
    if (!this.grid.has(newKey)) {
      this.grid.set(newKey, { users: new Set() });
    }
    this.grid.get(newKey)!.users.add(user.id);
  }
  
  /**
   * Remove user from spatial grid
   */
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
  
  /**
   * Find all users within proximity radius using spatial grid
   * This is the core optimization - O(n) instead of O(n²)
   */
  findNearbyUsers(user: User, allUsers: Map<string, User>): string[] {
    const nearby: string[] = [];
    const neighborKeys = this.getNeighborKeys(user.x, user.y);
    
    // Only check users in neighboring cells
    for (const key of neighborKeys) {
      const cell = this.grid.get(key);
      if (!cell) continue;
      
      for (const otherId of cell.users) {
        if (otherId === user.id) continue;
        
        const other = allUsers.get(otherId);
        if (!other) continue;
        if (other.lobbyRoomId !== user.lobbyRoomId) continue;
        
        // Precise distance check
        const distance = this.calculateDistance(user, other);
        if (distance < CONSTANTS.PROXIMITY_RADIUS) {
          nearby.push(otherId);
        }
      }
    }
    
    return nearby;
  }
  
  /**
   * Euclidean distance calculation
   */
  private calculateDistance(a: User, b: User): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Cleanup grid (call periodically)
   */
  cleanup(): void {
    // Remove empty cells to save memory
    for (const [key, cell] of this.grid.entries()) {
      if (cell.users.size === 0) {
        this.grid.delete(key);
      }
    }
  }
}
