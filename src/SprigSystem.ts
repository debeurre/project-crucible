import { Application, Graphics, Container, Texture, Sprite, Ticker } from 'pixi.js';
import { CONFIG } from './config';
import { MapSystem } from './systems/MapSystem';
import { FlowFieldSystem } from './systems/FlowFieldSystem';

// No more Sprig interface in DOD

export class SprigSystem {
    // Data-Oriented Storage
    private positionsX: Float32Array;
    private positionsY: Float32Array;
    private velocitiesX: Float32Array;
    private velocitiesY: Float32Array;
    private flashTimers: Uint8Array;
    private cargos: Uint8Array; // 0 = None, 1 = Wood
    
    // Visuals
    private sprigSprites: Sprite[]; // Array of Pixi Sprite objects
    private cargoSprites: Sprite[]; // Array of Pixi Sprite objects for cargo
    private sprigTexture: Texture; 
    private cargoTexture: Texture; 

    private app: Application;
    private mapSystem: MapSystem;
    private flowFieldSystem: FlowFieldSystem; 
    private parentContainer: Container; 

    private readonly MAX_SPRIG_COUNT: number = CONFIG.MAX_SPRIG_COUNT; 
    public activeSprigCount: number = 0; 

    constructor(app: Application, mapSystem: MapSystem, parentContainer: Container, flowFieldSystem: FlowFieldSystem) {
        this.app = app;
        this.mapSystem = mapSystem;
        this.parentContainer = parentContainer;
        this.flowFieldSystem = flowFieldSystem; 

        // Initialize typed arrays
        this.positionsX = new Float32Array(this.MAX_SPRIG_COUNT);
        this.positionsY = new Float32Array(this.MAX_SPRIG_COUNT);
        this.velocitiesX = new Float32Array(this.MAX_SPRIG_COUNT);
        this.velocitiesY = new Float32Array(this.MAX_SPRIG_COUNT);
        this.flashTimers = new Uint8Array(this.MAX_SPRIG_COUNT);
        this.cargos = new Uint8Array(this.MAX_SPRIG_COUNT); 

        this.sprigSprites = [];
        this.cargoSprites = [];
        this.sprigTexture = Texture.EMPTY; 
        this.cargoTexture = Texture.EMPTY; 

        this.initTextures();
        this.initPool(); 
    }

    private initTextures() {
        // Generate a simple white circle texture for sprigs
        const sprigGraphics = new Graphics();
        sprigGraphics.beginFill(0xFFFFFF); 
        sprigGraphics.drawCircle(0, 0, CONFIG.SPRIG_RADIUS);
        sprigGraphics.endFill();
        this.sprigTexture = this.app.renderer.generateTexture(sprigGraphics);

        // Generate a simple white square texture for cargo
        const cargoGraphics = new Graphics();
        cargoGraphics.beginFill(0xFFFFFF); 
        cargoGraphics.drawRect(-CONFIG.SPRIG_RADIUS, -CONFIG.SPRIG_RADIUS, CONFIG.SPRIG_RADIUS * 2, CONFIG.SPRIG_RADIUS * 2);
        cargoGraphics.endFill();
        this.cargoTexture = this.app.renderer.generateTexture(cargoGraphics);
    }


    private initPool() { 
        for (let i = 0; i < this.MAX_SPRIG_COUNT; i++) {
            const sprigSprite = new Sprite(this.sprigTexture);
            sprigSprite.tint = CONFIG.SPRIG_COLOR; 
            sprigSprite.anchor.set(0.5); 
            sprigSprite.visible = false; 
            
            const cargoSprite = new Sprite(this.cargoTexture);
            cargoSprite.anchor.set(0.5); 
            cargoSprite.visible = false; 
            cargoSprite.y = -12; 

            this.sprigSprites.push(sprigSprite); 
            this.cargoSprites.push(cargoSprite);
            this.parentContainer.addChild(sprigSprite); 
            sprigSprite.addChild(cargoSprite); 
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

        this.sprigSprites[i].x = this.positionsX[i];
        this.sprigSprites[i].y = this.positionsY[i];
        this.sprigSprites[i].tint = CONFIG.SPRIG_COLOR;
        this.sprigSprites[i].visible = true; 
        this.cargoSprites[i].visible = false; 

        this.activeSprigCount++;
    }
    
    public update(ticker: Ticker) {
        const dt = ticker.deltaTime; // Use scalar deltaTime (1.0 at target FPS)
        
        for (let i = 0; i < this.activeSprigCount; i++) { 
            this.applyBoids(i, dt);
            this.applyFlowField(i, dt); 
            this.updatePosition(i, dt);
            this.updateVisuals(i);
        }
    }

    private applyFlowField(idx: number, dt: number) {
        const sprigX = this.positionsX[idx];
        const sprigY = this.positionsY[idx];
        let sprigVelX = this.velocitiesX[idx];
        let sprigVelY = this.velocitiesY[idx];

        const newVel = this.flowFieldSystem.applyFlow(sprigX, sprigY, sprigVelX, sprigVelY, dt);
        // Flow field directly modifies velocity? Or applies force?
        // The implementation of applyFlow modifies velocity directly currently.
        // We should check FlowFieldSystem.
        // But assuming it returns NEW velocity, we just assign it.
        // Ideally flow field adds acceleration.
        
        this.velocitiesX[idx] = newVel.vx; 
        this.velocitiesY[idx] = newVel.vy;
    }

    private applyBoids(idx: number, dt: number) {
        let sepX = 0, sepY = 0;
        let aliX = 0, aliY = 0;
        let cohX = 0, cohY = 0;
        let neighborCount = 0;

        const sprigX = this.positionsX[idx];
        const sprigY = this.positionsY[idx];
        let sprigVelX = this.velocitiesX[idx]; 
        let sprigVelY = this.velocitiesY[idx]; 

        for (let otherIdx = 0; otherIdx < this.activeSprigCount; otherIdx++) { 
            if (idx === otherIdx) continue;

            const otherX = this.positionsX[otherIdx];
            const otherY = this.positionsY[otherIdx];
            const otherVelX = this.velocitiesX[otherIdx];
            const otherVelY = this.velocitiesY[otherIdx];

            const dx = sprigX - otherX;
            const dy = sprigY - otherY;
            const distSq = dx * dx + dy * dy;
            const radiusSq = CONFIG.PERCEPTION_RADIUS * CONFIG.PERCEPTION_RADIUS;

            if (distSq > 0 && distSq < radiusSq) {
                const distance = Math.sqrt(distSq);

                // Separation
                sepX += (dx / distance) / distance;
                sepY += (dy / distance) / distance;

                // Alignment
                aliX += otherVelX;
                aliY += otherVelY;

                // Cohesion
                cohX += otherX;
                cohY += otherY;

                neighborCount++;
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
        this.mapSystem.constrain(tempPosition, tempVelocity);
        this.positionsX[idx] = tempPosition.x;
        this.positionsY[idx] = tempPosition.y;
        this.velocitiesX[idx] = tempVelocity.x;
        this.velocitiesY[idx] = tempVelocity.y;
    }

    private updateVisuals(idx: number) {
        const sprigSprite = this.sprigSprites[idx];
        const cargoSprite = this.cargoSprites[idx];
        const flashTimer = this.flashTimers[idx];

        sprigSprite.x = this.positionsX[idx];
        sprigSprite.y = this.positionsY[idx];

        if (flashTimer > 0) {
            sprigSprite.tint = CONFIG.SPRIG_FLASH_COLOR;
            this.flashTimers[idx]--;
        } else {
            sprigSprite.tint = CONFIG.SPRIG_COLOR;
        }

        if (this.cargos[idx] !== 0) { 
            cargoSprite.visible = true;
            if (this.cargos[idx] === 1) { 
                cargoSprite.tint = 0x8B4513; 
            }
            cargoSprite.y = CONFIG.SPRIG_CARGO_OFFSET_Y; 
        } else {
            cargoSprite.visible = false;
        }
    }

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
}
