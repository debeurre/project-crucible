import { Application, Container, Graphics } from 'pixi.js';
import { CONFIG } from '../config';
import { MapShape } from '../types/MapTypes';

export class MapSystem {
  public container: Container;
  public mode: MapShape;
  private app: Application;
  private foreground: Graphics;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.mode = MapShape.FULL; 
    
    this.foreground = new Graphics();
    this.container.addChild(this.foreground);
    
    this.resize();
  }

  public getMode(): MapShape {
    return this.mode;
  }

  public setMode(mode: MapShape) {
    this.mode = mode;
    this.resize();
  }

  public resize() {
    const { width, height } = this.app.screen;

    this.foreground.clear();
    
    switch (this.mode) {
      case MapShape.FULL:
      case MapShape.ROOM1:
        this.foreground.rect(0, 0, width, height).fill(CONFIG.LAND_COLOR);
        break;
      case MapShape.TEST_ROOM:
        this.foreground.rect((width - 800) / 2, (height - 600) / 2, 800, 600).fill(0x333333);
        break;
    }
  }

  public isValidPosition(): boolean {
     // Both modes fill the screen
     return true;
  }

  public constrain(position: {x: number, y: number}, velocity: {x: number, y: number}, radius: number = 0) {
     this.clampPosition(position, velocity, radius);
  }

  public clampPosition(position: {x: number, y: number}, velocity?: {x: number, y: number}, radius: number = 0) {
     // Wrap Logic for both (or Clamp?)
     // FULL usually implies Wrap in this codebase context?
     // In previous code: FULL = Wrap.
     // Let's keep Wrap for FULL.
     // For ROOM1 (Blank Room), maybe Clamp?
     // "Test Room" usually implies closed box.
     // I'll use Clamp for ROOM1, Wrap for FULL.
     
     const { width, height } = this.app.screen;

     if (this.mode === MapShape.FULL) {
        if (position.x < 0) position.x += width;
        if (position.x > width) position.x -= width;
        if (position.y < 0) position.y += height;
        if (position.y > height) position.y -= height;
     } else if (this.mode === MapShape.ROOM1 || this.mode === MapShape.TEST_ROOM) {
        const minX = radius;
        const maxX = width - radius;
        const minY = radius;
        const maxY = height - radius;

        if (position.x < minX) { 
            position.x = minX; 
            if (velocity) velocity.x *= -1; 
        } else if (position.x > maxX) { 
            position.x = maxX; 
            if (velocity) velocity.x *= -1; 
        }
        
        if (position.y < minY) { 
            position.y = minY; 
            if (velocity) velocity.y *= -1; 
        } else if (position.y > maxY) { 
            position.y = maxY; 
            if (velocity) velocity.y *= -1; 
        }
     }
  }

  public getRandomPoint(padding: number): {x: number, y: number} {
      const { width, height } = this.app.screen;
      const point = { x: width / 2, y: height / 2 };

      // Random point in screen bounds
      point.x = padding + Math.random() * (width - 2 * padding);
      point.y = padding + Math.random() * (height - 2 * padding);
      
      return point;
  }
}
