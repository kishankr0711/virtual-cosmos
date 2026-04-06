export class InputManager {
  private keys: Set<string> = new Set();
  private onMove: (dx: number, dy: number) => void;
  private animationFrame: number | null = null;
  private isActive: boolean = true;
  private speed: number = 300; // pixels per second

  constructor(onMove: (dx: number, dy: number) => void) {
    this.onMove = onMove;
    this.setupListeners();
    this.startLoop();
    console.log('InputManager: Initialized with speed', this.speed);
  }
  
  private setupListeners(): void {
    // Capture on window to ensure we get keys even if canvas isn't focused
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp, { passive: false });
    
    console.log('InputManager: Event listeners attached');
  }
  
  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default for game keys to stop page scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    
    this.keys.add(e.code);
    this.keys.add(e.key.toLowerCase());
    
    // Also add common variants
    if (e.key === 'ArrowUp') this.keys.add('up');
    if (e.key === 'ArrowDown') this.keys.add('down');
    if (e.key === 'ArrowLeft') this.keys.add('left');
    if (e.key === 'ArrowRight') this.keys.add('right');
  };
  
  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    this.keys.delete(e.key.toLowerCase());
    
    if (e.key === 'ArrowUp') this.keys.delete('up');
    if (e.key === 'ArrowDown') this.keys.delete('down');
    if (e.key === 'ArrowLeft') this.keys.delete('left');
    if (e.key === 'ArrowRight') this.keys.delete('right');
  };
  
  private startLoop(): void {
    let lastTime = performance.now();
    
    const loop = (currentTime: number) => {
      if (!this.isActive) return;
      
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      this.update(deltaTime);
      this.animationFrame = requestAnimationFrame(loop);
    };
    
    this.animationFrame = requestAnimationFrame(loop);
    console.log('InputManager: Game loop started');
  }
  
  private update(deltaTime: number): void {
    let dx = 0;
    let dy = 0;
    
    // Check all possible key variants
    const up = this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.keys.has('up') || this.keys.has('w');
    const down = this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.keys.has('down') || this.keys.has('s');
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.keys.has('left') || this.keys.has('a');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.keys.has('right') || this.keys.has('d');
    
    if (up) dy -= 1;
    if (down) dy += 1;
    if (left) dx -= 1;
    if (right) dx += 1;
    
    // Only move if there's input
    if (dx !== 0 || dy !== 0) {
      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }
      
      // Calculate movement
      const moveX = dx * this.speed * deltaTime;
      const moveY = dy * this.speed * deltaTime;
      
      // Only call if movement is significant
      if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
        this.onMove(moveX, moveY);
      }
    }
  }
  
  destroy(): void {
    console.log('InputManager: Destroying...');
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}