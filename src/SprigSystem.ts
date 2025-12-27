import { Application, Graphics, Container, Texture, Sprite, Ticker } from 'pixi.js';
import { CONFIG } from './config';
import { MapSystem } from './systems/MapSystem';
import { FlowFieldSystem } from './systems/FlowFieldSystem';
import { MovementPathSystem } from './systems/MovementPathSystem';
import { TextureFactory } from './systems/TextureFactory';
import { GraphSystem } from './systems/GraphSystem';
import { TaskIntent } from './types/GraphTypes';
import { ResourceSystem } from './systems/ResourceSystem';
import { ItemSystem } from './systems/ItemSystem';

enum SprigState {
    IDLE = 0,
    HARVESTING = 1,
    HAULING = 2,
    FIGHTING = 3,
    RETURNING = 4
}

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
    private selected: Uint8Array; // 0 = False, 1 = True
    private pathIds: Int32Array; // -1 = None
    private roadEdgeIds: Int32Array; // -1 = None (For Sticky Roads)
    private pathNodeIndices: Int32Array; // Index of the next target node in the path (Shared for both)
    private animOffsets: Uint8Array; // Animation Frame Offset
    
    // Job Anchor System
    private jobIntents: Int32Array; // Sticky Intent
    private jobAnchorsX: Float32Array; // Last valid X
    private jobAnchorsY: Float32Array; // Last valid Y
    private jobLeashTimers: Float32Array; // Time outside zone
    
    // Inference Engine State
    private states: Uint8Array;
    private workTimers: Float32Array;
    private targets: Int32Array; // EntityID or NodeID
    private teams: Uint8Array; // 0 = Player, 1 = Invader

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
    private selectionSprites: Graphics[]; // Selection ring
    private sprigTextures: Texture[]; 
    private cargoTexture: Texture; 
    private globalTime: number = 0; // For sync animation

    private app: Application;
    private mapSystem: MapSystem;
    private flowFieldSystem: FlowFieldSystem; 
    private movementPathSystem: MovementPathSystem; 
    private graphSystem: GraphSystem; 
    private resourceSystem: ResourceSystem; 
    private itemSystem: ItemSystem; // New dependency
    public container: Container; 

    private readonly MAX_SPRIG_COUNT: number = CONFIG.MAX_SPRIG_COUNT; 
    public activeSprigCount: number = 0; 

    constructor(app: Application, mapSystem: MapSystem, flowFieldSystem: FlowFieldSystem, movementPathSystem: MovementPathSystem, graphSystem: GraphSystem, resourceSystem: ResourceSystem, itemSystem: ItemSystem) {
        this.app = app;
        this.mapSystem = mapSystem;
        this.flowFieldSystem = flowFieldSystem; 
        this.movementPathSystem = movementPathSystem;
        this.graphSystem = graphSystem;
        this.resourceSystem = resourceSystem;
        this.itemSystem = itemSystem;
        this.container = new Container();

        // Initialize typed arrays
        this.positionsX = new Float32Array(this.MAX_SPRIG_COUNT);
        this.positionsY = new Float32Array(this.MAX_SPRIG_COUNT);
        this.velocitiesX = new Float32Array(this.MAX_SPRIG_COUNT);
        this.velocitiesY = new Float32Array(this.MAX_SPRIG_COUNT);
        this.flashTimers = new Uint8Array(this.MAX_SPRIG_COUNT);
        this.cargos = new Uint8Array(this.MAX_SPRIG_COUNT); 
        this.intents = new Int32Array(this.MAX_SPRIG_COUNT);
        this.selected = new Uint8Array(this.MAX_SPRIG_COUNT);
        this.pathIds = new Int32Array(this.MAX_SPRIG_COUNT);
        this.roadEdgeIds = new Int32Array(this.MAX_SPRIG_COUNT);
        this.pathNodeIndices = new Int32Array(this.MAX_SPRIG_COUNT); 
        this.animOffsets = new Uint8Array(this.MAX_SPRIG_COUNT);
        
        this.jobIntents = new Int32Array(this.MAX_SPRIG_COUNT);
        this.jobAnchorsX = new Float32Array(this.MAX_SPRIG_COUNT);
        this.jobAnchorsY = new Float32Array(this.MAX_SPRIG_COUNT);
        this.jobLeashTimers = new Float32Array(this.MAX_SPRIG_COUNT);

        this.states = new Uint8Array(this.MAX_SPRIG_COUNT);
        this.workTimers = new Float32Array(this.MAX_SPRIG_COUNT);
        this.targets = new Int32Array(this.MAX_SPRIG_COUNT);
        this.teams = new Uint8Array(this.MAX_SPRIG_COUNT);

        // Initialize Spatial Hash Arrays (sized for max potential usage, resized in resize())
        this.gridNext = new Int32Array(this.MAX_SPRIG_COUNT);
        // Initial dummy size for gridHead, will be properly sized in resize()
        this.gridHead = new Int32Array(0);

        this.sprigContainers = [];
        this.sprigBodySprites = [];
        this.cargoSprites = [];
        this.selectionSprites = [];
        this.sprigTextures = []; 
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
        // Sprig Textures (Frames 1-3)
        this.sprigTextures = TextureFactory.getSprigTextures(this.app.renderer);

        // Cargo Texture
        this.cargoTexture = TextureFactory.getCargoTexture(this.app.renderer);
    }


    private initPool() { 
        for (let i = 0; i < this.MAX_SPRIG_COUNT; i++) {
            const container = new Container();
            container.visible = false;

            // Start with Frame 0
            const bodySprite = new Sprite(this.sprigTextures[0]);
            bodySprite.tint = CONFIG.SPRIG_COLOR; 
            bodySprite.anchor.set(0.5); 
            
            const cargoSprite = new Sprite(this.cargoTexture);
            cargoSprite.anchor.set(0.5); 
            cargoSprite.scale.set(CONFIG.SPRIG_CARGO_SCALE);
            cargoSprite.visible = false; 
            cargoSprite.y = -12; 

            // Selection Ring
            const selectionRing = new Graphics();
            selectionRing.circle(0, 0, CONFIG.SPRIG_RADIUS + 4).stroke({ width: 2, color: CONFIG.PENCIL_VISUALS.HIGHLIGHT_COLOR, alpha: CONFIG.PENCIL_VISUALS.HIGHLIGHT_ALPHA });
            selectionRing.visible = false;

            container.addChild(selectionRing); // Add first (bottom) or last (top)? Top is better visibility.
            container.addChild(bodySprite);
            container.addChild(cargoSprite);

            this.sprigContainers.push(container);
            this.sprigBodySprites.push(bodySprite);
            this.cargoSprites.push(cargoSprite);
            this.selectionSprites.push(selectionRing);
            
            this.container.addChild(container); 
        }
    }

    public spawnSprig(x: number, y: number, team: number = 0) {
        if (this.activeSprigCount >= this.MAX_SPRIG_COUNT) {
            return; 
        }

        const i = this.activeSprigCount; 

        // Spawn at random angle around the crucible with padding (only if player?)
        // If Invader (team 1), maybe spawn at x,y directly?
        // Logic: spawnSprig(x,y) spawns AT x,y but maybe with scatter?
        // Existing logic used scatter around crucible.
        // I'll keep scatter logic but center on x,y.
        const angle = Math.random() * Math.PI * 2;
        const dist = 5; // Small scatter
        
        this.positionsX[i] = x + Math.cos(angle) * dist;
        this.positionsY[i] = y + Math.sin(angle) * dist;

        // Zero initial velocity (idling)
        this.velocitiesX[i] = 0;
        this.velocitiesY[i] = 0;
        
        this.flashTimers[i] = 0;
        this.cargos[i] = 0; 
        this.intents[i] = -1; // Default intent
        this.selected[i] = 0;
        this.pathIds[i] = -1;
        this.roadEdgeIds[i] = -1;
        this.pathNodeIndices[i] = 0; // Start at beginning of path
        this.animOffsets[i] = Math.floor(Math.random() * CONFIG.ROUGHJS.WIGGLE_FRAMES);
        
        this.jobIntents[i] = -1;
        this.jobAnchorsX[i] = x;
        this.jobAnchorsY[i] = y;
        this.jobLeashTimers[i] = 0;

        this.states[i] = SprigState.IDLE;
        this.workTimers[i] = 0;
        this.targets[i] = -1;
        this.teams[i] = team;

        this.sprigContainers[i].x = this.positionsX[i];
        this.sprigContainers[i].y = this.positionsY[i];
        this.sprigContainers[i].visible = true;
        
        if (team === 1) {
            this.sprigBodySprites[i].tint = 0x808080; // Grey for Invaders
        } else {
            this.sprigBodySprites[i].tint = CONFIG.SPRIG_COLOR;
        }
        
        this.cargoSprites[i].visible = false; 
        this.selectionSprites[i].visible = false;

        this.activeSprigCount++;
    }
    
    public update(ticker: Ticker) {
        const dt = ticker.deltaTime; 
        this.globalTime += dt / 60; 
        
        this.updateSpatialHash();

        for (let i = 0; i < this.activeSprigCount; i++) { 
            // 1. Path Override (Lasso)
            const pathId = this.pathIds[i];
            if (pathId !== -1) {
                this.applyPathMovement(i, pathId);
                this.updatePosition(i, dt);
                this.updateVisuals(i);
                continue;
            }

            // 2. Invader Logic
            if (this.teams[i] === 1) {
                this.applyInvaderLogic(i);
                if (i >= this.activeSprigCount) { i--; continue; } // Sprig removed
                this.updatePosition(i, dt);
                this.updateVisuals(i);
                continue;
            }

            // 3. Inference Engine
            this.checkContext(i, dt);
            
            // 4. State Execution
            this.executeState(i, dt);
            
            this.updatePosition(i, dt);
            this.updateVisuals(i);
        }
    }

    private checkContext(i: number, dt: number) {
        // A. Hauler
        if (this.cargos[i] === 1) {
            this.states[i] = SprigState.HAULING;
            return;
        }

        // Read Intent
        const x = this.positionsX[i];
        const y = this.positionsY[i];
        const intent = this.flowFieldSystem.getIntentAt(x, y);
        
        // Job Anchor Logic
        if (intent !== null) {
            this.jobIntents[i] = intent;
            this.jobAnchorsX[i] = x;
            this.jobAnchorsY[i] = y;
            this.jobLeashTimers[i] = 0;
        } else if (this.jobIntents[i] !== -1) {
            // Outside Zone: Leash
            this.jobLeashTimers[i] += dt / 60;
            if (this.jobLeashTimers[i] > 5.0) {
                 this.jobIntents[i] = -1; // Fired
            } else {
                 this.states[i] = SprigState.RETURNING;
                 this.intents[i] = this.jobIntents[i]; // Keep visual color
                 return;
            }
        }

        this.intents[i] = intent !== null ? intent : -1;

        // B. Harvester
        if (this.cargos[i] === 0 && intent === TaskIntent.GREEN_HARVEST) {
            // Check for cooldown (if we just harvested)
            if (this.states[i] === SprigState.IDLE && this.workTimers[i] > 0) {
                 return; // Cooldown active, stay IDLE (and wander)
            }

            if (this.states[i] === SprigState.HARVESTING) return;
            
            if (this.resourceSystem.isNearSource(x, y, CONFIG.PERCEPTION_RADIUS)) {
                this.states[i] = SprigState.HARVESTING;
                this.workTimers[i] = 4.0; 
                return;
            }
        }

        // C. Guard
        if (intent === TaskIntent.RED_ATTACK) {
             this.states[i] = SprigState.FIGHTING;
             return;
        }

        // D. Wanderer
        this.states[i] = SprigState.IDLE;
    }

    private executeState(i: number, dt: number) {
        switch(this.states[i]) {
            case SprigState.IDLE:
                // Decrement Cooldown
                if (this.workTimers[i] > 0) {
                    this.workTimers[i] -= dt / 60;
                }

                this.applyBoids(i, dt);
                this.applyFlowField(i, dt);
                
                // Random Wander if Green Intent (to avoid clumping)
                if (this.intents[i] === TaskIntent.GREEN_HARVEST) {
                    const wanderStrength = 0.5;
                    this.velocitiesX[i] += (Math.random() - 0.5) * wanderStrength;
                    this.velocitiesY[i] += (Math.random() - 0.5) * wanderStrength;
                }
                break;
            case SprigState.HAULING:
                const onRoad = this.applyStickyRoadMovement(i);
                if (!onRoad) {
                    const heart = this.resourceSystem.getCastlePosition();
                    this.seek(i, heart.x, heart.y, 1.0);
                }
                break;
            case SprigState.HARVESTING:
                this.velocitiesX[i] = 0;
                this.velocitiesY[i] = 0;
                this.workTimers[i] -= dt / 60;
                if (this.workTimers[i] <= 0) {
                    // Harvest Complete
                    // Spawn Item
                    this.itemSystem.spawnItem(this.positionsX[i], this.positionsY[i], 'BERRY');
                    
                    // Reset to Idle with Cooldown
                    this.states[i] = SprigState.IDLE;
                    this.workTimers[i] = 1.0; // 1s Cooldown
                    
                    // Wander nudge
                    const speed = CONFIG.MAX_SPEED;
                    this.velocitiesX[i] = (Math.random() - 0.5) * speed;
                    this.velocitiesY[i] = (Math.random() - 0.5) * speed;
                }
                break;
            case SprigState.RETURNING:
                this.seek(i, this.jobAnchorsX[i], this.jobAnchorsY[i], 1.0);
                this.applyBoids(i, dt);
                break;
            case SprigState.FIGHTING:
                this.applyBoids(i, dt); 
                break;
        }
    }

    private applyInvaderLogic(i: number) {
        const heart = this.resourceSystem.getCastlePosition();
        this.seek(i, heart.x, heart.y, 0.5);
        
        if (this.resourceSystem.isInsideCastle(this.positionsX[i], this.positionsY[i])) {
             this.resourceSystem.feedCastle(-20);
             this.removeSprig(i);
        }
    }

    private seek(idx: number, tx: number, ty: number, speedScale: number = 1.0) {
        const sx = this.positionsX[idx];
        const sy = this.positionsY[idx];
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 0) {
            const speed = CONFIG.MAX_SPEED * speedScale;
            this.velocitiesX[idx] = (dx / dist) * speed;
            this.velocitiesY[idx] = (dy / dist) * speed;
        }
    }

    private removeSprig(i: number) {
        const last = this.activeSprigCount - 1;
        if (i !== last) {
            this.positionsX[i] = this.positionsX[last];
            this.positionsY[i] = this.positionsY[last];
            this.velocitiesX[i] = this.velocitiesX[last];
            this.velocitiesY[i] = this.velocitiesY[last];
            this.flashTimers[i] = this.flashTimers[last];
            this.cargos[i] = this.cargos[last];
            this.intents[i] = this.intents[last];
            this.selected[i] = this.selected[last];
            this.pathIds[i] = this.pathIds[last];
            this.roadEdgeIds[i] = this.roadEdgeIds[last];
            this.pathNodeIndices[i] = this.pathNodeIndices[last];
            this.animOffsets[i] = this.animOffsets[last];
            
            this.jobIntents[i] = this.jobIntents[last];
            this.jobAnchorsX[i] = this.jobAnchorsX[last];
            this.jobAnchorsY[i] = this.jobAnchorsY[last];
            this.jobLeashTimers[i] = this.jobLeashTimers[last];

            this.states[i] = this.states[last];
            this.workTimers[i] = this.workTimers[last];
            this.targets[i] = this.targets[last];
            this.teams[i] = this.teams[last];
            
            // Visuals are pooled, but tint might need reset if swapping germ/player?
            // updateVisuals handles tint based on team/intent.
            // But if I swap a Germ (Grey) into a Player slot, updateVisuals needs to know.
            // updateVisuals uses this.intents[i] for color.
            // Does it use teams?
            // I need to update updateVisuals to handle teams.
        }
        
        this.sprigContainers[last].visible = false;
        this.activeSprigCount--;
    }

    private applyPathMovement(idx: number, pathId: number): boolean {
        const path = this.movementPathSystem.getPath(pathId);
        if (!path) {
            // Path destroyed or invalid
            this.pathIds[idx] = -1;
            return false;
        }

        const targetIndex = this.pathNodeIndices[idx];
        if (targetIndex >= path.points.length) {
            // End of path reached
            this.pathIds[idx] = -1;
            return false;
        }

        const target = path.points[targetIndex];
        const sx = this.positionsX[idx];
        const sy = this.positionsY[idx];
        
        const dx = target.x - sx;
        const dy = target.y - sy;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        const speed = CONFIG.MAX_SPEED * 1.5; // Slightly faster on paths? Or normal speed.
        // Let's use normal max speed for now, maybe customizable.
        
        // Move towards target
        if (dist > 0) {
            // Steering behavior: Seek
            // We want to override velocity completely or steer?
            // "Units traverse the path nodes strictly" -> Override is clearer.
            // Direct velocity set.
            const vx = (dx / dist) * speed;
            const vy = (dy / dist) * speed;
            
            this.velocitiesX[idx] = vx;
            this.velocitiesY[idx] = vy;
        }

        // Check arrival
        const arrivalThreshold = 10; // 10px radius
        if (dist < arrivalThreshold) {
            this.pathNodeIndices[idx]++; // Next point
        }

        return true;
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

    private applyStickyRoadMovement(idx: number): boolean {
        let edgeId = this.roadEdgeIds[idx];
        
        if (edgeId === -1) {
            const x = this.positionsX[idx];
            const y = this.positionsY[idx];
            const edge = this.graphSystem.getNearestEdge(x, y, 40); 
            
            if (edge) {
                edgeId = edge.id;
                this.roadEdgeIds[idx] = edgeId;
                this.pathNodeIndices[idx] = this.findClosestPointIndex(edge.points, x, y);
            } else {
                return false; 
            }
        }

        const edge = this.graphSystem.getEdge(edgeId);
        if (!edge || !edge.points || edge.points.length === 0) {
            this.roadEdgeIds[idx] = -1;
            return false;
        }

        let targetIdx = this.pathNodeIndices[idx];
        if (targetIdx >= edge.points.length) {
            this.roadEdgeIds[idx] = -1;
            return false;
        }

        const pt = edge.points[targetIdx];
        const tx = pt.gx * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2;
        const ty = pt.gy * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2;

        const sx = this.positionsX[idx];
        const sy = this.positionsY[idx];
        
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 0) {
            const speed = CONFIG.MAX_SPEED * 1.5; 
            this.velocitiesX[idx] = (dx / dist) * speed;
            this.velocitiesY[idx] = (dy / dist) * speed;
        }

        if (dist < 10) {
            this.pathNodeIndices[idx]++;
        }

        return true;
    }

    private findClosestPointIndex(points: {gx: number, gy: number}[], x: number, y: number): number {
        let bestDist = Infinity;
        let bestIdx = 0;
        for(let i=0; i<points.length; i++) {
            const px = points[i].gx * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2;
            const py = points[i].gy * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2;
            const d = (px-x)**2 + (py-y)**2;
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        return bestIdx;
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

    public setSelected(idx: number, isSelected: boolean) {
        this.selected[idx] = isSelected ? 1 : 0;
    }

    public setPath(idx: number, pathId: number) {
        this.pathIds[idx] = pathId;
        this.pathNodeIndices[idx] = 0; // Reset progress
    }

    public getActivePathIds(): Set<number> {
        const activeIds = new Set<number>();
        for (let i = 0; i < this.activeSprigCount; i++) {
            const id = this.pathIds[i];
            if (id !== -1) {
                activeIds.add(id);
            }
        }
        return activeIds;
    }

    public getSelectedIndices(): number[] {
        const indices = [];
        for (let i = 0; i < this.activeSprigCount; i++) {
            if (this.selected[i] === 1) {
                indices.push(i);
            }
        }
        return indices;
    }

    private updateVisuals(idx: number) {
        const container = this.sprigContainers[idx];
        const bodySprite = this.sprigBodySprites[idx];
        const cargoSprite = this.cargoSprites[idx];
        const selectionRing = this.selectionSprites[idx];
        const flashTimer = this.flashTimers[idx];

        container.x = this.positionsX[idx];
        container.y = this.positionsY[idx];

        // Animation Loop
        const frame = Math.floor(this.globalTime * CONFIG.ROUGHJS.WIGGLE_FPS);
        const texIdx = (frame + this.animOffsets[idx]) % CONFIG.ROUGHJS.WIGGLE_FRAMES;
        bodySprite.texture = this.sprigTextures[texIdx];

        // Selection Visuals
        selectionRing.visible = this.selected[idx] === 1;

        if (flashTimer > 0) {
            bodySprite.tint = CONFIG.SPRIG_FLASH_COLOR;
            this.flashTimers[idx]--;
        } else if (this.teams[idx] === 1) {
            bodySprite.tint = 0x808080; // Invader Grey
        } else {
            // Use Intent Color if present, else Default
            const intentId = this.intents[idx];
            if (intentId !== -1) {
                bodySprite.tint = CONFIG.INTENT_COLORS[intentId];
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

    public isPlayer(idx: number): boolean {
        return this.teams[idx] === 0;
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

    public getSprigAt(x: number, y: number, radius: number = CONFIG.SPRIG_RADIUS): number {
        const rSq = radius * radius;
        let bestDistSq = rSq;
        let bestIdx = -1;

        const startX = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const endX = Math.min(this.gridCols - 1, Math.floor((x + radius) / this.cellSize));
        const startY = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const endY = Math.min(this.gridRows - 1, Math.floor((y + radius) / this.cellSize));

        for (let cy = startY; cy <= endY; cy++) {
            for (let cx = startX; cx <= endX; cx++) {
                const cellIndex = cy * this.gridCols + cx;
                let i = this.gridHead[cellIndex];

                while (i !== -1) {
                    const dx = this.positionsX[i] - x;
                    const dy = this.positionsY[i] - y;
                    const dSq = dx * dx + dy * dy;

                    if (dSq < bestDistSq) {
                        bestDistSq = dSq;
                        bestIdx = i;
                    }
                    i = this.gridNext[i];
                }
            }
        }
        return bestIdx;
    }

    public removeSprigsAt(x: number, y: number, radius: number) {
        const rSq = radius * radius;
        const toRemove: number[] = [];

        const startX = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const endX = Math.min(this.gridCols - 1, Math.floor((x + radius) / this.cellSize));
        const startY = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const endY = Math.min(this.gridRows - 1, Math.floor((y + radius) / this.cellSize));

        for (let cy = startY; cy <= endY; cy++) {
            for (let cx = startX; cx <= endX; cx++) {
                const cellIndex = cy * this.gridCols + cx;
                let i = this.gridHead[cellIndex];

                while (i !== -1) {
                    const dx = this.positionsX[i] - x;
                    const dy = this.positionsY[i] - y;
                    const dSq = dx * dx + dy * dy;

                    if (dSq < rSq) {
                        toRemove.push(i);
                    }
                    i = this.gridNext[i];
                }
            }
        }

        if (toRemove.length === 0) return;

        // Sort descending to handle swap-remove safely
        toRemove.sort((a, b) => b - a);

        for (const idx of toRemove) {
            if (idx >= this.activeSprigCount) continue;

            const last = this.activeSprigCount - 1;
            if (idx !== last) {
                this.positionsX[idx] = this.positionsX[last];
                this.positionsY[idx] = this.positionsY[last];
                this.velocitiesX[idx] = this.velocitiesX[last];
                this.velocitiesY[idx] = this.velocitiesY[last];
                this.flashTimers[idx] = this.flashTimers[last];
                this.cargos[idx] = this.cargos[last];
                this.intents[idx] = this.intents[last];
                this.selected[idx] = this.selected[last];
                this.pathIds[idx] = this.pathIds[last];
                this.pathNodeIndices[idx] = this.pathNodeIndices[last];
                
                this.jobIntents[idx] = this.jobIntents[last];
                this.jobAnchorsX[idx] = this.jobAnchorsX[last];
                this.jobAnchorsY[idx] = this.jobAnchorsY[last];
                this.jobLeashTimers[idx] = this.jobLeashTimers[last];
            }
            
            this.sprigContainers[last].visible = false;
            this.activeSprigCount--;
        }
    }

    public clearAll() {
        this.activeSprigCount = 0;
        for(const container of this.sprigContainers) {
            container.visible = false;
        }
    }
}
