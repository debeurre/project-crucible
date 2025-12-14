import { Application, Graphics, Container, Texture, Sprite, Ticker } from 'pixi.js';
import { CONFIG } from './config';
import { MapSystem } from './systems/MapSystem';
import { FlowFieldSystem } from './systems/FlowFieldSystem';
import { TaskIntent } from './types/GraphTypes';

// No more Sprig interface in DOD

export class SprigSystem {
    // Data-Oriented Storage
    private positionsX: Float32Array;
    private positionsY: Float32Array;
    private velocitiesX: Float32Array;
    private velocitiesY: Float32Array;
    private flashTimers: Uint8Array;
    private cargos: Uint8Array; // 0 = None, 1 = Wood
    private intents: Int32Array; // TaskIntent
    
    // Spatial Hash Grid
    private gridHead: Int32Array;
    private gridNext: Int32Array;
    private gridCols: number = 0;
    private gridRows: number = 0;
    private readonly cellSize: number = CONFIG.PERCEPTION_RADIUS;

    // Visuals
    private sprigContainers: Container[]; // Main container for each sprig
    private sprigBodySprites: Sprite[];   // The body sprite (for tinting)
    private cargoSprites: Sprite[];       // The cargo sprite
    private sprigTexture: Texture; 
    private cargoTexture: Texture; 

    private app: Application;
    private mapSystem: MapSystem;
    private flowFieldSystem: FlowFieldSystem; 
    public container: Container; 

    private readonly MAX_SPRIG_COUNT: number = CONFIG.MAX_SPRIG_COUNT; 
    public activeSprigCount: number = 0; 

    constructor(app: Application, mapSystem: MapSystem, flowFieldSystem: FlowFieldSystem) {
        this.app = app;
        this.mapSystem = mapSystem;
        this.flowFieldSystem = flowFieldSystem; 
        this.container = new Container();

        // Initialize typed arrays
        this.positionsX = new Float32Array(this.MAX_SPRIG_COUNT);
        this.positionsY = new Float32Array(this.MAX_SPRIG_COUNT);
        this.velocitiesX = new Float32Array(this.MAX_SPRIG_COUNT);
        this.velocitiesY = new Float32Array(this.MAX_SPRIG_COUNT);
        this.flashTimers = new Uint8Array(this.MAX_SPRIG_COUNT);
        this.cargos = new Uint8Array(this.MAX_SPRIG_COUNT); 
        this.intents = new Int32Array(this.MAX_SPRIG_COUNT);
        
        // Initialize Spatial Hash Arrays (sized for max potential usage, resized in resize())
        this.gridNext = new Int32Array(this.MAX_SPRIG_COUNT);
        // Initial dummy size for gridHead, will be properly sized in resize()
        this.gridHead = new Int32Array(0);

        this.sprigContainers = [];
        this.sprigBodySprites = [];
        this.cargoSprites = [];
        this.sprigTexture = Texture.EMPTY; 
        this.cargoTexture = Texture.EMPTY; 

        this.initTextures();
        this.initPool(); 
        this.resize(); // Setup grid based on initial screen size
    }

    public resize() {
        // Calculate grid dimensions
        this.gridCols = Math.ceil(this.app.screen.width / this.cellSize);
        this.gridRows = Math.ceil(this.app.screen.height / this.cellSize);
        
        const cellCount = this.gridCols * this.gridRows;
        
        // Reallocate gridHead if necessary
        if (this.gridHead.length < cellCount) {
            this.gridHead = new Int32Array(cellCount);
        }
    }

    private initTextures() {
        // Sprig Texture (Circle) via Canvas for robustness
        const r = CONFIG.SPRIG_RADIUS;
        const d = r * 2;
        const canvas = document.createElement('canvas');
        canvas.width = d;
        canvas.height = d;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(r, r, r, 0, Math.PI * 2);
            ctx.fill();
        }
        this.sprigTexture = Texture.from(canvas);

        // Cargo Texture (Square) via Canvas
        const canvas2 = document.createElement('canvas');
        canvas2.width = d;
        canvas2.height = d;
        const ctx2 = canvas2.getContext('2d');
        if (ctx2) {
            ctx2.fillStyle = '#ffffff';
            ctx2.fillRect(0, 0, d, d);
        }
        this.cargoTexture = Texture.from(canvas2);
    }


    private initPool() { 
        for (let i = 0; i < this.MAX_SPRIG_COUNT; i++) {
            const container = new Container();
            container.visible = false;

            const bodySprite = new Sprite(this.sprigTexture);
            bodySprite.tint = CONFIG.SPRIG_COLOR; 
            bodySprite.anchor.set(0.5); 
            
            const cargoSprite = new Sprite(this.cargoTexture);
            cargoSprite.anchor.set(0.5); 
            cargoSprite.scale.set(CONFIG.SPRIG_CARGO_SCALE);
            cargoSprite.visible = false; 
            cargoSprite.y = -12; 

            container.addChild(bodySprite);
            container.addChild(cargoSprite);

            this.sprigContainers.push(container);
            this.sprigBodySprites.push(bodySprite);
            this.cargoSprites.push(cargoSprite);
            
            this.container.addChild(container); 
        }
    }

    public spawnSprig(x: number, y: number) {
        if (this.activeSprigCount >= this.MAX_SPRIG_COUNT) {
            return; 
        }

        const i = this.activeSprigCount; 

        // Spawn at random angle around the crucible with padding
        const angle = Math.random() * Math.PI * 2;
        const dist = CONFIG.CRUCIBLE_RADIUS + CONFIG.CRUCIBLE_SPAWN_PADDING;
        
        this.positionsX[i] = x + Math.cos(angle) * dist;
        this.positionsY[i] = y + Math.sin(angle) * dist;

        // Zero initial velocity (idling)
        this.velocitiesX[i] = 0;
        this.velocitiesY[i] = 0;
        
        this.flashTimers[i] = 0;
        this.cargos[i] = 0; 
        this.intents[i] = -1; // Default intent

        this.sprigContainers[i].x = this.positionsX[i];
        this.sprigContainers[i].y = this.positionsY[i];
        this.sprigContainers[i].visible = true;
        
        this.sprigBodySprites[i].tint = CONFIG.SPRIG_COLOR;
        this.cargoSprites[i].visible = false; 

        this.activeSprigCount++;
    }
    
    public update(ticker: Ticker) {
        const dt = ticker.deltaTime; // Use scalar deltaTime (1.0 at target FPS)
        
        this.updateSpatialHash();

        for (let i = 0; i < this.activeSprigCount; i++) { 
            this.applyBoids(i, dt);
            this.applyFlowField(i, dt); 
            this.updatePosition(i, dt);
            this.updateVisuals(i);
        }
    }

    private updateSpatialHash() {
        // Reset grid heads for the active cells
        // Note: Filling the entire array might be slow if the world is huge, 
        // but for screen-sized grids (e.g. 80x40 = 3200 cells) it's fast.
        const activeCells = this.gridCols * this.gridRows;
        this.gridHead.fill(-1, 0, activeCells);

        for (let i = 0; i < this.activeSprigCount; i++) {
            const x = this.positionsX[i];
            const y = this.positionsY[i];

            // Clamp to grid bounds
            let cx = Math.floor(x / this.cellSize);
            let cy = Math.floor(y / this.cellSize);

            if (cx < 0) cx = 0;
            if (cx >= this.gridCols) cx = this.gridCols - 1;
            if (cy < 0) cy = 0;
            if (cy >= this.gridRows) cy = this.gridRows - 1;

            const cellIndex = cy * this.gridCols + cx;

            // Insert into linked list
            this.gridNext[i] = this.gridHead[cellIndex];
            this.gridHead[cellIndex] = i;
        }
    }

    private applyFlowField(idx: number, dt: number) {
        const sprigX = this.positionsX[idx];
        const sprigY = this.positionsY[idx];
        let sprigVelX = this.velocitiesX[idx];
        let sprigVelY = this.velocitiesY[idx];

        const { vx, vy, intent } = this.flowFieldSystem.applyFlow(sprigX, sprigY, sprigVelX, sprigVelY, dt);
        
        this.velocitiesX[idx] = vx; 
        this.velocitiesY[idx] = vy;
        
        if (intent !== null) {
            this.intents[idx] = intent;
        }
    }
    
    // ... applyBoids, updatePosition (unchanged)

    private applyBoids(idx: number, dt: number) {
        let sepX = 0, sepY = 0;
        let aliX = 0, aliY = 0;
        let cohX = 0, cohY = 0;
        let neighborCount = 0;

        const sprigX = this.positionsX[idx];
        const sprigY = this.positionsY[idx];
        let sprigVelX = this.velocitiesX[idx]; 
        let sprigVelY = this.velocitiesY[idx]; 

        // Calculate own grid position
        let cx = Math.floor(sprigX / this.cellSize);
        let cy = Math.floor(sprigY / this.cellSize);
        
        // Clamp (though should match updateSpatialHash)
        if (cx < 0) cx = 0;
        if (cx >= this.gridCols) cx = this.gridCols - 1;
        if (cy < 0) cy = 0;
        if (cy >= this.gridRows) cy = this.gridRows - 1;

        const radiusSq = CONFIG.PERCEPTION_RADIUS * CONFIG.PERCEPTION_RADIUS;

        // Check 3x3 Neighbor Cells
        const startX = Math.max(0, cx - 1);
        const endX = Math.min(this.gridCols - 1, cx + 1);
        const startY = Math.max(0, cy - 1);
        const endY = Math.min(this.gridRows - 1, cy + 1);

        for (let ny = startY; ny <= endY; ny++) {
            for (let nx = startX; nx <= endX; nx++) {
                const cellIndex = ny * this.gridCols + nx;
                let otherIdx = this.gridHead[cellIndex];

                while (otherIdx !== -1) {
                    if (idx !== otherIdx) {
                        const otherX = this.positionsX[otherIdx];
                        const otherY = this.positionsY[otherIdx];
                        
                        const dx = sprigX - otherX;
                        const dy = sprigY - otherY;
                        const distSq = dx * dx + dy * dy;

                        if (distSq > 0 && distSq < radiusSq) {
                            const distance = Math.sqrt(distSq);

                            // Separation
                            sepX += (dx / distance) / distance;
                            sepY += (dy / distance) / distance;

                            // Alignment
                            aliX += this.velocitiesX[otherIdx];
                            aliY += this.velocitiesY[otherIdx];

                            // Cohesion
                            cohX += otherX;
                            cohY += otherY;

                            neighborCount++;
                        }
                    }
                    otherIdx = this.gridNext[otherIdx];
                }
            }
        }

        if (neighborCount > 0) {
            // Normalize and Apply Forces
            // 1. Alignment
            aliX /= neighborCount;
            aliY /= neighborCount;
            const aliLen = Math.sqrt(aliX * aliX + aliY * aliY);
            if (aliLen > 0) {
                aliX = (aliX / aliLen) * CONFIG.ALIGNMENT_FORCE;
                aliY = (aliY / aliLen) * CONFIG.ALIGNMENT_FORCE;
            }

            // 2. Cohesion
            cohX /= neighborCount;
            cohY /= neighborCount;
            cohX -= sprigX;
            cohY -= sprigY;
            const cohLen = Math.sqrt(cohX * cohX + cohY * cohY);
            if (cohLen > 0) {
                cohX = (cohX / cohLen) * CONFIG.COHESION_FORCE;
                cohY = (cohY / cohLen) * CONFIG.COHESION_FORCE;
            }

            // 3. Separation
            const sepLen = Math.sqrt(sepX * sepX + sepY * sepY);
            if (sepLen > 0) {
                sepX = (sepX / sepLen) * CONFIG.SEPARATION_FORCE;
                sepY = (sepY / sepLen) * CONFIG.SEPARATION_FORCE;
            }

            // Apply Forces scaled by DeltaTime
            sprigVelX += (sepX + aliX + cohX) * dt;
            sprigVelY += (sepY + aliY + cohY) * dt;
        }
        
        this.velocitiesX[idx] = sprigVelX;
        this.velocitiesY[idx] = sprigVelY;
    }

    private updatePosition(idx: number, dt: number) {
        let velX = this.velocitiesX[idx];
        let velY = this.velocitiesY[idx];

        // Apply cargo slowdown (Scale movement, don't reduce stored velocity permanently)
        let effectiveSpeedScale = 1.0;
        if (this.isCarrying(idx)) {
            effectiveSpeedScale = CONFIG.SPRIG_CARGO_SLOWDOWN_FACTOR;
        }

        // Calculate speed squared
        const speedSq = velX * velX + velY * velY;
        const maxSq = CONFIG.MAX_SPEED * CONFIG.MAX_SPEED;

        // Clamp speed
        if (speedSq > maxSq) {
            const speed = Math.sqrt(speedSq);
            const scale = CONFIG.MAX_SPEED / speed;
            velX *= scale;
            velY *= scale;
        }
        
        // Update stored velocity (with damping/friction)
        const frictionFactor = Math.pow(CONFIG.FRICTION, dt);
        this.velocitiesX[idx] = velX * frictionFactor; 
        this.velocitiesY[idx] = velY * frictionFactor;

        // Move scaled by dt using the effective (slowed) velocity
        const moveVelX = velX * effectiveSpeedScale;
        const moveVelY = velY * effectiveSpeedScale;

        this.positionsX[idx] += moveVelX * dt;
        this.positionsY[idx] += moveVelY * dt;

        // Delegate boundary checks to MapSystem
        const tempPosition = {x: this.positionsX[idx], y: this.positionsY[idx]};
        const tempVelocity = {x: this.velocitiesX[idx], y: this.velocitiesY[idx]};
        this.mapSystem.constrain(tempPosition, tempVelocity, CONFIG.SPRIG_RADIUS);
        this.positionsX[idx] = tempPosition.x;
        this.positionsY[idx] = tempPosition.y;
        this.velocitiesX[idx] = tempVelocity.x;
        this.velocitiesY[idx] = tempVelocity.y;
    }

    private updateVisuals(idx: number) {
        const container = this.sprigContainers[idx];
        const bodySprite = this.sprigBodySprites[idx];
        const cargoSprite = this.cargoSprites[idx];
        const flashTimer = this.flashTimers[idx];

        container.x = this.positionsX[idx];
        container.y = this.positionsY[idx];

        if (flashTimer > 0) {
            bodySprite.tint = CONFIG.SPRIG_FLASH_COLOR;
            this.flashTimers[idx]--;
        } else {
            // Use Intent Color if present, else Default
            const intent = this.intents[idx];
            if (intent !== -1) {
                bodySprite.tint = intent;
            } else {
                bodySprite.tint = CONFIG.SPRIG_COLOR;
            }
        }

        if (this.cargos[idx] !== 0) { 
            cargoSprite.visible = true;
            if (this.cargos[idx] === 1) { 
                cargoSprite.tint = 0x8B4513; 
            }
            cargoSprite.y = CONFIG.SPRIG_CARGO_OFFSET_Y;

            // Apply Cargo Squash (Volume Preserved)
            const sy = CONFIG.SPRIG_SQUASH_Y_WITH_CARGO;
            const sx = 1.0 / sy;
            bodySprite.scale.set(sx, sy);

        } else {
            cargoSprite.visible = false;
            // Reset Scale
            bodySprite.scale.set(1.0, 1.0);
        }
    }
    
    // ... other methods (isSprigActive, isCarrying, setCargo, getSprigBounds, clearAll)
    
    public isSprigActive(idx: number): boolean {
        return idx < this.activeSprigCount;
    }

    public isCarrying(idx: number): boolean {
        return this.cargos[idx] !== 0;
    }

    public setCargo(idx: number, cargoType: number) {
        this.cargos[idx] = cargoType;
    }

    public getSprigBounds(idx: number): {x: number, y: number, radius: number} {
        return {
            x: this.positionsX[idx],
            y: this.positionsY[idx],
            radius: CONFIG.SPRIG_RADIUS
        };
    }

    public removeSprigsAt(x: number, y: number, radius: number) {
        const rSq = radius * radius;
        let i = 0;
        while (i < this.activeSprigCount) {
            const dx = this.positionsX[i] - x;
            const dy = this.positionsY[i] - y;
            if (dx*dx + dy*dy < rSq) {
                // Remove sprig (Swap with last active)
                const last = this.activeSprigCount - 1;
                
                if (i !== last) {
                    this.positionsX[i] = this.positionsX[last];
                    this.positionsY[i] = this.positionsY[last];
                    this.velocitiesX[i] = this.velocitiesX[last];
                    this.velocitiesY[i] = this.velocitiesY[last];
                    this.flashTimers[i] = this.flashTimers[last];
                    this.cargos[i] = this.cargos[last];
                    this.intents[i] = this.intents[last];
                    // Visuals are pooled, just need to update their usage in next frame update
                    // But we should swap visual state if needed? 
                    // Actually, visuals are linked by index `i` in updateVisuals.
                    // So we effectively moved the data of 'last' to 'i'.
                }
                
                // Hide the removed container (which was at 'last', now effectively unused)
                this.sprigContainers[last].visible = false;
                
                this.activeSprigCount--;
                // Don't increment i, check the swapped sprig
            } else {
                i++;
            }
        }
    }

    public clearAll() {
        this.activeSprigCount = 0;
        for(const container of this.sprigContainers) {
            container.visible = false;
        }
    }
}
