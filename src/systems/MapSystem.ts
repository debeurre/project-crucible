import { Application, Container, Graphics, Rectangle, Circle } from 'pixi.js';
import { CONFIG } from '../config';

export enum MapShape {
  FULL = 'FULL',
  RECT = 'RECT',
  SQUARE = 'SQUARE',
  CIRCLE = 'CIRCLE',
  PROCGEN = 'PROCGEN',
  MIRROR = 'MIRROR',
  RADIAL = 'RADIAL',
}

export class MapSystem {
  public container: Container;
  public mode: MapShape;
  private app: Application;
  private background: Graphics;
  private foreground: Graphics;
  
  // Shapes
  private rectShape: Rectangle;
  private circleShape: Circle;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.mode = MapShape.RECT; 
    
    this.background = new Graphics();
    this.foreground = new Graphics();
    this.container.addChild(this.background);
    this.container.addChild(this.foreground);
    
    // Initialize shapes with defaults, will be updated in resize()
    this.rectShape = new Rectangle(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this.circleShape = new Circle(0, 0, 500);

    this.resize();
  }

  public setMode(mode: MapShape) {
    this.mode = mode;
    this.resize();
  }

  public resize() {
    const { width, height } = this.app.screen;
    const centerX = width / 2;
    const centerY = height / 2;

    this.background.clear();
    this.background.rect(0, 0, width, height).fill(CONFIG.BG_COLOR);

    this.foreground.clear();
    
    switch (this.mode) {
      case MapShape.FULL:
        this.foreground.rect(0, 0, width, height).fill(CONFIG.LAND_COLOR);
        break;
      case MapShape.RECT:
        this.rectShape.x = centerX - CONFIG.MAP_WIDTH / 2;
        this.rectShape.y = centerY - CONFIG.MAP_HEIGHT / 2;
        this.rectShape.width = CONFIG.MAP_WIDTH;
        this.rectShape.height = CONFIG.MAP_HEIGHT;
        this.foreground.rect(this.rectShape.x, this.rectShape.y, this.rectShape.width, this.rectShape.height).fill(CONFIG.LAND_COLOR);
        break;
      case MapShape.SQUARE:
        const sqSize = 1000;
        this.rectShape.width = sqSize;
        this.rectShape.height = sqSize;
        this.rectShape.x = centerX - sqSize / 2;
        this.rectShape.y = centerY - sqSize / 2;
        this.foreground.rect(this.rectShape.x, this.rectShape.y, sqSize, sqSize).fill(CONFIG.LAND_COLOR);
        break;
      case MapShape.CIRCLE:
        this.circleShape.x = centerX;
        this.circleShape.y = centerY;
        this.foreground.circle(centerX, centerY, this.circleShape.radius).fill(CONFIG.LAND_COLOR);
        break;
      // TODO: Implement PROCGEN, MIRROR, RADIAL
    }
  }
  
  public isValidPosition(x: number, y: number): boolean {
     switch (this.mode) {
      case MapShape.FULL:
        return true;
        
      case MapShape.RECT:
      case MapShape.SQUARE:
        return this.rectShape.contains(x, y);
        
      case MapShape.CIRCLE:
        return this.circleShape.contains(x, y);
        
      default:
        return true;
    }
  }

  // Helper to bounce/clamp position
  public constrain(position: {x: number, y: number}, velocity: {x: number, y: number}) {
     switch (this.mode) {
      case MapShape.FULL:
        // Wrap
        const { width, height } = this.app.screen;
        if (position.x < 0) position.x += width;
        if (position.x > width) position.x -= width;
        if (position.y < 0) position.y += height;
        if (position.y > height) position.y -= height;
        break;

      case MapShape.RECT:
      case MapShape.SQUARE:
        // Bounce
        // We use a small epsilon or offset to prevent sticking if needed, but simple reflection is fine for now.
        if (position.x < this.rectShape.x) { 
            position.x = this.rectShape.x; 
            velocity.x *= -1; 
        } else if (position.x > this.rectShape.x + this.rectShape.width) { 
            position.x = this.rectShape.x + this.rectShape.width; 
            velocity.x *= -1; 
        }
        
        if (position.y < this.rectShape.y) { 
            position.y = this.rectShape.y; 
            velocity.y *= -1; 
        } else if (position.y > this.rectShape.y + this.rectShape.height) { 
            position.y = this.rectShape.y + this.rectShape.height; 
            velocity.y *= -1; 
        }
        break;

      case MapShape.CIRCLE:
         // Radial push
         const dx = position.x - this.circleShape.x;
         const dy = position.y - this.circleShape.y;
         const distSq = dx * dx + dy * dy;
         const radiusSq = this.circleShape.radius * this.circleShape.radius;

         if (distSq > radiusSq) {
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx);
            position.x = this.circleShape.x + Math.cos(angle) * this.circleShape.radius;
            position.y = this.circleShape.y + Math.sin(angle) * this.circleShape.radius;
            
            // Reflect velocity
             const nx = dx / dist;
             const ny = dy / dist;
             const dot = velocity.x * nx + velocity.y * ny;
             velocity.x -= 2 * dot * nx;
             velocity.y -= 2 * dot * ny;
         }
         break;
     }
  }
}
