import { Application, Container, Graphics, Rectangle, Circle } from 'pixi.js';
import { CONFIG } from '../config';
import { MapShape } from '../types/MapTypes';

export class MapSystem {
  public container: Container;
  public mode: MapShape;
  private app: Application;
  private foreground: Graphics;
  
  // Shapes
  private rectShape: Rectangle;
  private circleShape: Circle;
  
  // ProcGen
  private grid: boolean[][] = [];
  private gridWidth = 0;
  private gridHeight = 0;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.mode = MapShape.RECT; 
    
    this.foreground = new Graphics();
    this.container.addChild(this.foreground);
    
    // Initialize shapes with defaults, will be updated in resize()
    this.rectShape = new Rectangle(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this.circleShape = new Circle(0, 0, 500);

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
    const centerX = width / 2;
    const centerY = height / 2;

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
      case MapShape.PROCGEN:
      case MapShape.MIRROR:
      case MapShape.RADIAL:
        this.generateProcGen();
        break;
    }
  }
  
  private generateProcGen() {
      const cellSize = CONFIG.CELL_SIZE;
      const cols = Math.ceil(this.app.screen.width / cellSize);
      const rows = Math.ceil(this.app.screen.height / cellSize);
      
      this.gridWidth = cols;
      this.gridHeight = rows;
      this.grid = [];

      // Initialize random (true = LAND)
      for (let x = 0; x < cols; x++) {
          this.grid[x] = [];
          for (let y = 0; y < rows; y++) {
              // 50% chance of Land initially (was 48%)
              this.grid[x][y] = Math.random() < 0.50;
          }
      }
      
      // Cellular Automata Smoothing (5 iterations)
      for (let i = 0; i < 5; i++) {
          const newGrid: boolean[][] = [];
          for (let x = 0; x < cols; x++) {
              newGrid[x] = [];
              for (let y = 0; y < rows; y++) {
                   let neighbors = 0;
                   for (let nx = x - 1; nx <= x + 1; nx++) {
                       for (let ny = y - 1; ny <= y + 1; ny++) {
                           if (nx === x && ny === y) continue;
                           // Edges are "water" (false) to create islands
                           if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
                               // neighbors += 0; 
                           } else if (this.grid[nx][ny]) {
                               neighbors++;
                           }
                       }
                   }
                   
                   // The "4-5 rule": If >= 4 neighbors are LAND, stay/become LAND.
                   newGrid[x][y] = neighbors >= 4;
              }
          }
          this.grid = newGrid;
      }

      // Symmetry Logic
      if (this.mode === MapShape.MIRROR) {
          // 180-degree Rotational Symmetry (S-shape / Point Symmetry)
          // Instead of mirroring Left->Right, we rotate Top-Half -> Bottom-Half inverted.
          const halfH = Math.ceil(rows / 2);
          for (let y = 0; y < halfH; y++) {
              for (let x = 0; x < cols; x++) {
                  this.grid[cols - 1 - x][rows - 1 - y] = this.grid[x][y];
              }
          }
      } else if (this.mode === MapShape.RADIAL) {
          // 4-way Rotational Symmetry (90, 180, 270 degrees)
          // Pivot around center
          const cx = Math.floor(cols / 2);
          const cy = Math.floor(rows / 2);
          
          // Iterate Top-Left Quadrant (approximately)
          // We over-iterate slightly to ensure coverage, but rely on the source being the "seed"
          for (let x = 0; x < cx; x++) {
              for (let y = 0; y < cy; y++) {
                  const val = this.grid[x][y];
                  
                  // 1. 180 deg (Opposite corner) - Always fits in rectangle
                  this.grid[cols - 1 - x][rows - 1 - y] = val;

                  // For 90/270, we need coordinate rotation math
                  // Relative to center
                  const dx = x - cx;
                  const dy = y - cy;

                  // 2. 90 deg: (-dy, dx)
                  const r1x = cx - dy;
                  const r1y = cy + dx;
                  if (r1x >= 0 && r1x < cols && r1y >= 0 && r1y < rows) {
                      this.grid[r1x][r1y] = val;
                  }

                  // 3. 270 deg: (dy, -dx)
                  const r2x = cx + dy;
                  const r2y = cy - dx;
                  if (r2x >= 0 && r2x < cols && r2y >= 0 && r2y < rows) {
                      this.grid[r2x][r2y] = val;
                  }
              }
          }
      }
      
      // Draw
      for (let x = 0; x < cols; x++) {
          for (let y = 0; y < rows; y++) {
              if (this.grid[x][y]) {
                  this.foreground.rect(x * cellSize, y * cellSize, cellSize, cellSize).fill(CONFIG.LAND_COLOR);
              }
          }
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
      case MapShape.PROCGEN:
      case MapShape.MIRROR:
      case MapShape.RADIAL:
        const cx = Math.floor(x / CONFIG.CELL_SIZE);
        const cy = Math.floor(y / CONFIG.CELL_SIZE);
        if (cx < 0 || cx >= this.gridWidth || cy < 0 || cy >= this.gridHeight) return false;
        return this.grid[cx][cy];
        
      default:
        return true;
    }
  }

  // Helper to bounce/clamp position
  public constrain(position: {x: number, y: number}, velocity: {x: number, y: number}, radius: number = 0) {
     this.clampPosition(position, velocity, radius);
  }

  public clampPosition(position: {x: number, y: number}, velocity?: {x: number, y: number}, radius: number = 0) {
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
        // Bounce / Clamp with Radius
        const minX = this.rectShape.x + radius;
        const maxX = this.rectShape.x + this.rectShape.width - radius;
        const minY = this.rectShape.y + radius;
        const maxY = this.rectShape.y + this.rectShape.height - radius;

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
        break;

      case MapShape.CIRCLE:
         // Radial push with Radius
         const dx = position.x - this.circleShape.x;
         const dy = position.y - this.circleShape.y;
         const distSq = dx * dx + dy * dy;
         
         // Effective radius for the object center
         const effectiveRadius = Math.max(0, this.circleShape.radius - radius);
         const effectiveRadiusSq = effectiveRadius * effectiveRadius;

         if (distSq > effectiveRadiusSq) {
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx);
            position.x = this.circleShape.x + Math.cos(angle) * effectiveRadius;
            position.y = this.circleShape.y + Math.sin(angle) * effectiveRadius;
            
            if (velocity) {
                // Reflect velocity
                 const nx = dx / dist;
                 const ny = dy / dist;
                 const dot = velocity.x * nx + velocity.y * ny;
                 velocity.x -= 2 * dot * nx;
                 velocity.y -= 2 * dot * ny;
            }
         }
         break;
         
      case MapShape.PROCGEN:
      case MapShape.MIRROR:
      case MapShape.RADIAL:
         let targetCx = Math.floor(position.x / CONFIG.CELL_SIZE);
         let targetCy = Math.floor(position.y / CONFIG.CELL_SIZE);
         
         let needsRelocation = false;

         // Check if current position (center) is even on the grid or is in water
         if (targetCx < 0 || targetCx >= this.gridWidth || targetCy < 0 || targetCy >= this.gridHeight || 
             !this.grid[targetCx][targetCy]) {
             needsRelocation = true; // Center is in void
         } else if (!this.isClearForRadius(targetCx, targetCy, radius)) {
             needsRelocation = true; // Center is land, but area around it is not clear for the object's radius
         }
         
         if (needsRelocation) {
             // 1. Bounce Velocity
             if (velocity) {
                 velocity.x *= -1;
                 velocity.y *= -1;
                 // Backtrack one step
                 position.x += velocity.x; 
                 position.y += velocity.y;
             }

             // 2. Re-verify if the backtrack fixed it
             targetCx = Math.floor(position.x / CONFIG.CELL_SIZE);
             targetCy = Math.floor(position.y / CONFIG.CELL_SIZE);
             
             let stillInvalid = false;
             if (targetCx < 0 || targetCx >= this.gridWidth || targetCy < 0 || targetCy >= this.gridHeight || 
                 !this.grid[targetCx][targetCy]) {
                 stillInvalid = true;
             } else if (!this.isClearForRadius(targetCx, targetCy, radius)) {
                 stillInvalid = true;
             }

             // 3. Emergency Nudge (Iterative Solver)
             // If still stuck, push towards map center instead of searching 400+ cells.
             // This distributes the "search" over multiple frames.
             if (stillInvalid) {
                 const centerX = this.app.screen.width / 2;
                 const centerY = this.app.screen.height / 2;
                 const dx = centerX - position.x;
                 const dy = centerY - position.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 if (dist > 1) {
                     // Push by one cell size to try and clear the obstacle
                     const nudge = CONFIG.CELL_SIZE; 
                     position.x += (dx / dist) * nudge;
                     position.y += (dy / dist) * nudge;
                 } else {
                     // Exactly at center but invalid (e.g. center is water). 
                     // Force jump to 0,0 (top left) or just ignore to prevent NaN.
                     position.x = centerX;
                     position.y = centerY;
                 }
             }
         }
         break;
     }
  }

  // Helper to check if an area around a cell is entirely land for a given radius
  private isClearForRadius(centerX: number, centerY: number, radius: number): boolean {
    if (radius === 0) return true; // No radius means no extra check needed

    // Convert radius to number of cells to check outwards
    const cellsNeeded = Math.ceil(radius / CONFIG.CELL_SIZE);

    // Check cells in a square region around the center cell
    for (let dx = -cellsNeeded; dx <= cellsNeeded; dx++) {
      for (let dy = -cellsNeeded; dy <= cellsNeeded; dy++) {
        const checkCx = centerX + dx;
        const checkCy = centerY + dy;

        // If any cell in the required area is outside grid bounds or is water
        if (checkCx < 0 || checkCx >= this.gridWidth || 
            checkCy < 0 || checkCy >= this.gridHeight || 
            !this.grid[checkCx][checkCy]) {
          return false; // Not clear
        }
      }
    }
    return true; // All cells in the region are land
  }

  public getRandomPoint(padding: number): {x: number, y: number} {
      const { width, height } = this.app.screen;
      const point = { x: width / 2, y: height / 2 };

      switch (this.mode) {
          case MapShape.FULL:
              point.x = padding + Math.random() * (width - 2 * padding);
              point.y = padding + Math.random() * (height - 2 * padding);
              break;
          
          case MapShape.RECT:
          case MapShape.SQUARE:
              point.x = this.rectShape.x + padding + Math.random() * (this.rectShape.width - 2 * padding);
              point.y = this.rectShape.y + padding + Math.random() * (this.rectShape.height - 2 * padding);
              break;
              
          case MapShape.CIRCLE:
              const maxR = Math.max(0, this.circleShape.radius - padding);
              // Uniform distribution
              const r = maxR * Math.sqrt(Math.random());
              const theta = Math.random() * 2 * Math.PI;
              point.x = this.circleShape.x + r * Math.cos(theta);
              point.y = this.circleShape.y + r * Math.sin(theta);
              break;

          case MapShape.PROCGEN:
          case MapShape.MIRROR:
          case MapShape.RADIAL:
              // Try to find a valid land cell
              for(let i=0; i<50; i++) {
                  const cx = Math.floor(Math.random() * this.gridWidth);
                  const cy = Math.floor(Math.random() * this.gridHeight);
                  if (this.grid[cx] && this.grid[cx][cy]) {
                      // Check margin from grid edges roughly
                      if (cx * CONFIG.CELL_SIZE < padding || (this.gridWidth - cx) * CONFIG.CELL_SIZE < padding ||
                          cy * CONFIG.CELL_SIZE < padding || (this.gridHeight - cy) * CONFIG.CELL_SIZE < padding) {
                              continue; 
                          }
                      
                      point.x = cx * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
                      point.y = cy * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
                      return point;
                  }
              }
              // Fallback to center if fails
              break;
      }
      return point;
  }
}
