import * as PIXI from 'pixi.js';
import type { User } from '../types';
import { Interpolator } from './Interpolation';

export class PixiEngine {
  public app!: PIXI.Application;
  public userSprites: Map<string, PIXI.Container> = new Map();
  private gameContainer!: PIXI.Container;
  private connectionGraphics!: PIXI.Graphics;
  private worldGraphics!: PIXI.Graphics;
  private roomLabelContainer!: PIXI.Container;
  private interpolator: Interpolator;

  private cameraTarget: { x: number; y: number } = { x: 1000, y: 1000 };
  private cameraSmoothness = 0.12;
  private worldWidth = 1440;
  private worldHeight = 860;
  private isInitialized = false;

  constructor() {
    this.interpolator = new Interpolator();
  }

  async init(containerElement: HTMLElement): Promise<void> {
    const width = containerElement.clientWidth || window.innerWidth;
    const height = containerElement.clientHeight || window.innerHeight;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    containerElement.appendChild(canvas);

    this.app = new PIXI.Application();
    await this.app.init({
      canvas: canvas as HTMLCanvasElement,
      width,
      height,
      backgroundColor: 0xbfdff8,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    this.gameContainer = new PIXI.Container();
    this.app.stage.addChild(this.gameContainer);

    this.worldGraphics = new PIXI.Graphics();
    this.gameContainer.addChild(this.worldGraphics);

    this.roomLabelContainer = new PIXI.Container();
    this.gameContainer.addChild(this.roomLabelContainer);

    this.connectionGraphics = new PIXI.Graphics();
    this.gameContainer.addChild(this.connectionGraphics);

    this.app.ticker.add(() => this.update());

    this.drawWorld();
    this.isInitialized = true;
  }

  private drawWorld(): void {
    const g = this.worldGraphics;
    g.clear();
    this.roomLabelContainer.removeChildren().forEach((child) => child.destroy());
    const topZoneHeight = this.worldHeight * 0.43;
    const floorTop = topZoneHeight;
    const midX = this.worldWidth / 2;

    // Main floor base.
    g.rect(0, 0, this.worldWidth, this.worldHeight);
    g.fill(0xf0d19b);

    // Top room band split into two rooms.
    g.rect(0, 0, midX, topZoneHeight);
    g.fill(0xc9b391);
    g.rect(midX, 0, midX, topZoneHeight);
    g.fill(0xbda276);

    // Top room plank texture.
    g.stroke({ width: 2, color: 0x9f855f, alpha: 0.5 });
    for (let y = 10; y < topZoneHeight; y += 18) {
      g.moveTo(0, y);
      g.lineTo(this.worldWidth, y);
    }
    g.stroke({ width: 1, color: 0x8d6f49, alpha: 0.35 });
    for (let x = 16; x < this.worldWidth; x += 26) {
      g.moveTo(x, 0);
      g.lineTo(x, topZoneHeight);
    }

    // Divider between room 1 and room 2.
    g.rect(midX - 3, 0, 6, topZoneHeight);
    g.fill(0x7f4f38);

    // Floor separator.
    g.rect(0, floorTop - 7, this.worldWidth, 7);
    g.fill(0x8b5a3d);

    // Bottom open floor texture.
    g.stroke({ width: 2, color: 0xd8b87f, alpha: 0.6 });
    for (let y = floorTop + 14; y <= this.worldHeight; y += 20) {
      g.moveTo(0, y);
      g.lineTo(this.worldWidth, y);
    }

    // Simple chair blocks in top rooms.
    this.drawChair(g, 70, 64);
    this.drawChair(g, 70, 145);
    this.drawChair(g, this.worldWidth - 125, 85, true);
    this.drawChair(g, this.worldWidth - 125, 165, true);

    // Room labels like sample.
    this.drawRoomLabel(g, 40, topZoneHeight - 34, 'Room 2');
    this.drawRoomLabel(g, midX + 24, topZoneHeight - 34, 'Room 1');

    // World border.
    g.stroke({ width: 6, color: 0x6f4428, alpha: 0.85 });
    g.rect(0, 0, this.worldWidth, this.worldHeight);
  }

  private drawChair(g: PIXI.Graphics, x: number, y: number, light = false): void {
    g.roundRect(x, y, 20, 24, 3);
    g.fill(light ? 0xf1e8db : 0x7a4a35);
    g.roundRect(x + 4, y + 26, 12, 8, 2);
    g.fill(light ? 0xd6c8b7 : 0x643b2b);
  }

  private drawRoomLabel(g: PIXI.Graphics, x: number, y: number, text: string): void {
    g.roundRect(x, y, 96, 24, 5);
    g.fill(0x1e2438);
    g.rect(x + 4, y + 4, 4, 16);
    g.fill(0x0ecb81);
    const label = new PIXI.Text({
      text,
      style: {
        fontFamily: 'Verdana',
        fontSize: 13,
        fill: 0xf8fafc,
        fontWeight: '700'
      }
    });
    label.x = x + 16;
    label.y = y + 5;
    this.roomLabelContainer.addChild(label);
  }

  setWorldBounds(width: number, height: number): void {
    this.worldWidth = width;
    this.worldHeight = height;
    this.drawWorld();
  }

  handleResize(): void {
    const parent = this.app.canvas.parentElement;
    if (parent) {
      this.app.renderer.resize(parent.clientWidth, parent.clientHeight);
    }
  }

  updateUser(user: User, isLocal: boolean, isConnected: boolean): void {
    if (!this.isInitialized) return;

    let sprite = this.userSprites.get(user.id);

    if (!sprite) {
      sprite = this.createUserSprite(user, isLocal);
      this.userSprites.set(user.id, sprite);
      this.gameContainer.addChild(sprite);
    }

    const proximityRing = sprite.getChildByName('proximityRing') as PIXI.Graphics;
    const torso = sprite.getChildByName('torso') as PIXI.Graphics;
    const label = sprite.getChildByName('label') as PIXI.Text;
    const initials = sprite.getChildByName('initials') as PIXI.Text;

    if (label.text !== user.name) {
      label.text = user.name;
      initials.text = this.initials(user.name);
    }

    if (isLocal) {
      sprite.x = user.x;
      sprite.y = user.y;
    } else if (user.velocity) {
      this.interpolator.addPosition(user.id, user.x, user.y, user.velocity, Date.now());
    }

    const color = this.colorToHex(user.color);
    torso.tint = color;

    proximityRing.alpha = isConnected ? 0.45 : 0.1;
    proximityRing.tint = isConnected ? 0x4ade80 : color;
  }

  private createUserSprite(user: User, isLocal: boolean): PIXI.Container {
    const container = new PIXI.Container();

    const proximityRing = new PIXI.Graphics();
    proximityRing.name = 'proximityRing';
    proximityRing.circle(0, 0, 100);
    proximityRing.fill({ color: this.colorToHex(user.color), alpha: 0.09 });
    proximityRing.alpha = 0.1;
    container.addChild(proximityRing);

    const shadow = new PIXI.Graphics();
    shadow.ellipse(0, 20, 14, 6);
    shadow.fill({ color: 0x000000, alpha: 0.18 });
    container.addChild(shadow);

    const legs = new PIXI.Graphics();
    legs.roundRect(-10, 4, 8, 16, 3);
    legs.roundRect(2, 4, 8, 16, 3);
    legs.fill(0x334155);
    container.addChild(legs);

    const torso = new PIXI.Graphics();
    torso.name = 'torso';
    torso.roundRect(-12, -8, 24, 18, 7);
    torso.fill(this.colorToHex(user.color));
    container.addChild(torso);

    const arms = new PIXI.Graphics();
    arms.roundRect(-16, -6, 4, 14, 2);
    arms.roundRect(12, -6, 4, 14, 2);
    arms.fill(0xf4c79f);
    container.addChild(arms);

    const head = new PIXI.Graphics();
    head.circle(0, -16, 10);
    head.fill(0xf4c79f);
    container.addChild(head);

    const hair = new PIXI.Graphics();
    hair.circle(0, -20, 10);
    hair.fill(0x1f2937);
    hair.roundRect(-10, -20, 20, 6, 3);
    hair.fill(0x1f2937);
    container.addChild(hair);

    const eyes = new PIXI.Graphics();
    eyes.circle(-3.5, -16, 1.2);
    eyes.circle(3.5, -16, 1.2);
    eyes.fill(0x111827);
    container.addChild(eyes);

    const mouth = new PIXI.Graphics();
    mouth.roundRect(-3, -11, 6, 1.8, 1);
    mouth.fill(0x92400e);
    container.addChild(mouth);

    const outline = new PIXI.Graphics();
    if (isLocal) {
      outline.roundRect(-15, -28, 30, 50, 10);
      outline.stroke({ width: 3, color: 0xffffff, alpha: 0.95 });
    } else {
      outline.roundRect(-15, -28, 30, 50, 10);
      outline.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
    }
    container.addChild(outline);

    const initials = new PIXI.Text({
      text: this.initials(user.name),
      style: {
        fontFamily: 'Verdana',
        fontSize: 7,
        fill: 0xffffff,
        align: 'center',
        fontWeight: '700'
      }
    });
    initials.name = 'initials';
    initials.anchor.set(0.5);
    initials.y = 0;
    container.addChild(initials);

    const label = new PIXI.Text({
      text: user.name,
      style: {
        fontFamily: 'Verdana',
        fontSize: 11,
        fill: 0x111827,
        align: 'center'
      }
    });
    label.name = 'label';
    label.anchor.set(0.5);
    label.y = 26;
    container.addChild(label);

    container.x = user.x;
    container.y = user.y;

    return container;
  }

  removeUser(userId: string): void {
    if (!this.isInitialized) return;

    const sprite = this.userSprites.get(userId);
    if (sprite) {
      this.gameContainer.removeChild(sprite);
      sprite.destroy({ children: true });
      this.userSprites.delete(userId);
      this.interpolator.removeUser(userId);
    }
  }

  setCameraTarget(x: number, y: number): void {
    this.cameraTarget = { x, y };
  }

  updateConnections(users: User[], connectedPairs: Set<string>): void {
    if (!this.isInitialized) return;

    const g = this.connectionGraphics;
    g.clear();

    if (connectedPairs.size === 0) return;

    g.stroke({ width: 2, color: 0x4ade80, alpha: 0.65 });

    for (const pairKey of connectedPairs) {
      const [id1, id2] = pairKey.split('-');
      const u1 = users.find((u) => u.id === id1);
      const u2 = users.find((u) => u.id === id2);

      if (u1 && u2) {
        g.moveTo(u1.x, u1.y);
        g.lineTo(u2.x, u2.y);
      }
    }
  }

  private update(): void {
    if (!this.isInitialized) return;

    const now = Date.now();
    for (const [userId, sprite] of this.userSprites) {
      const pos = this.interpolator.getPosition(userId, now);
      if (pos) {
        sprite.x = pos.x;
        sprite.y = pos.y;
      }
    }

    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    const targetX = -this.cameraTarget.x + screenW / 2;
    const targetY = -this.cameraTarget.y + screenH / 2;

    const clampedX = this.worldWidth <= screenW
      ? (screenW - this.worldWidth) / 2
      : Math.max(-this.worldWidth + screenW, Math.min(0, targetX));
    const clampedY = this.worldHeight <= screenH
      ? (screenH - this.worldHeight) / 2
      : Math.max(-this.worldHeight + screenH, Math.min(0, targetY));

    this.gameContainer.x += (clampedX - this.gameContainer.x) * this.cameraSmoothness;
    this.gameContainer.y += (clampedY - this.gameContainer.y) * this.cameraSmoothness;
  }

  destroy(): void {
    this.isInitialized = false;
    try {
      this.app.destroy(true, { children: true });
    } catch {
      // noop
    }
  }

  private colorToHex(color: string): number {
    return Number.parseInt(color.replace('#', '0x'), 16);
  }

  private initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';
  }
}
