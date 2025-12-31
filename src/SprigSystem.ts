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
import { MapShape } from './types/MapTypes';
import { TraceSystem, TraceType } from './systems/TraceSystem';
import { StructureType } from './types/StructureTypes';

enum SprigState {
    IDLE = 0,
    HARVESTING = 1,
    HAULING = 2,
    FIGHTING = 3,
    RETURNING = 4,
    RETRIEVING = 5
}

export class SprigSystem {
    // Data-Oriented Storage
    private positionsX: Float32Array;
    private positionsY: Float32Array;
    private velocitiesX: Float32Array;
    private velocitiesY: Float32Array;
    private flashTimers: Uint8Array;
    private cargos: Uint8Array; 
    private intents: Int32Array; 
    private selected: Uint8Array; 
    private pathIds: Int32Array; 
    private roadEdgeIds: Int32Array; 
    private pathNodeIndices: Int32Array; 
    private animOffsets: Uint8Array; 
    
    private jobIntents: Int32Array; 
    private jobAnchorsX: Float32Array; 
    private jobAnchorsY: Float32Array; 
    private jobLeashTimers: Float32Array; 
    
    private targetItemIds: Int32Array; 
    private traceTimers: Float32Array; 

    private states: Uint8Array;
    private workTimers: Float32Array;
    private targets: Int32Array; 
    private teams: Uint8Array; 

    private gridHead: Int32Array;
    private gridNext: Int32Array;
    private gridCols: number = 0;
    private gridRows: number = 0;
    private readonly cellSize: number = CONFIG.PERCEPTION_RADIUS;

    private sprigContainers: Container[]; 
    private sprigBodySprites: Sprite[];   
    private cargoSprites: Sprite[];       
    private selectionSprites: Graphics[]; 
    private sprigTextures: Texture[]; 
    private cargoTexture: Texture; 
    private globalTime: number = 0; 

    private app: Application;
    private mapSystem: MapSystem;
    private flowFieldSystem: FlowFieldSystem; 
    private movementPathSystem: MovementPathSystem; 
    private graphSystem: GraphSystem; 
    private resourceSystem: ResourceSystem; 
    private itemSystem: ItemSystem;
    private traceSystem: TraceSystem; 
    public container: Container; 

    private readonly MAX_SPRIG_COUNT: number = CONFIG.MAX_SPRIG_COUNT; 
    public activeSprigCount: number = 0; 

    constructor(
        app: Application, 
        mapSystem: MapSystem, 
        flowFieldSystem: FlowFieldSystem, 
        movementPathSystem: MovementPathSystem, 
        graphSystem: GraphSystem, 
        resourceSystem: ResourceSystem, 
        itemSystem: ItemSystem, 
        traceSystem: TraceSystem
    ) {
        this.app = app;
        this.mapSystem = mapSystem;
        this.flowFieldSystem = flowFieldSystem; 
        this.movementPathSystem = movementPathSystem;
        this.graphSystem = graphSystem;
        this.resourceSystem = resourceSystem;
        this.itemSystem = itemSystem;
        this.traceSystem = traceSystem;
        this.container = new Container();

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
        
        this.targetItemIds = new Int32Array(this.MAX_SPRIG_COUNT);
        this.targetItemIds.fill(-1);
        this.traceTimers = new Float32Array(this.MAX_SPRIG_COUNT);

        this.states = new Uint8Array(this.MAX_SPRIG_COUNT);
        this.workTimers = new Float32Array(this.MAX_SPRIG_COUNT);
        this.targets = new Int32Array(this.MAX_SPRIG_COUNT);
        this.teams = new Uint8Array(this.MAX_SPRIG_COUNT);

        this.gridNext = new Int32Array(this.MAX_SPRIG_COUNT);
        this.gridHead = new Int32Array(0);

        this.sprigContainers = [];
        this.sprigBodySprites = [];
        this.cargoSprites = [];
        this.selectionSprites = [];
        this.sprigTextures = []; 
        this.cargoTexture = Texture.EMPTY; 

        this.initTextures();
        this.initPool(); 
        this.resize(); 
    }

    public resize() {
        this.gridCols = Math.ceil(this.app.screen.width / this.cellSize);
        this.gridRows = Math.ceil(this.app.screen.height / this.cellSize);
        const cellCount = this.gridCols * this.gridRows;
        if (this.gridHead.length < cellCount) {
            this.gridHead = new Int32Array(cellCount);
        }
    }

    private initTextures() {
        this.sprigTextures = TextureFactory.getSprigTextures(this.app.renderer);
        this.cargoTexture = TextureFactory.getCargoTexture(this.app.renderer);
    }

    private initPool() { 
        for (let i = 0; i < this.MAX_SPRIG_COUNT; i++) {
            const container = new Container();
            container.visible = false;
            const bodySprite = new Sprite(this.sprigTextures[0]);
            bodySprite.tint = CONFIG.SPRIG_COLOR; 
            bodySprite.anchor.set(0.5); 
            const cargoSprite = new Sprite(this.cargoTexture);
            cargoSprite.anchor.set(0.5); 
            cargoSprite.scale.set(CONFIG.SPRIG_CARGO_SCALE);
            cargoSprite.visible = false; 
            cargoSprite.y = -12; 
            const selectionRing = new Graphics();
            selectionRing.circle(0, 0, CONFIG.SPRIG_RADIUS + 4).stroke({ width: 2, color: CONFIG.PENCIL_VISUALS.HIGHLIGHT_COLOR, alpha: CONFIG.PENCIL_VISUALS.HIGHLIGHT_ALPHA });
            selectionRing.visible = false;
            container.addChild(selectionRing);
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
        if (this.activeSprigCount >= this.MAX_SPRIG_COUNT) return; 
        const i = this.activeSprigCount; 
        const angle = Math.random() * Math.PI * 2;
        const dist = 5; 
        this.positionsX[i] = x + Math.cos(angle) * dist;
        this.positionsY[i] = y + Math.sin(angle) * dist;
        this.velocitiesX[i] = 0; this.velocitiesY[i] = 0;
        this.flashTimers[i] = 0; this.cargos[i] = 0; this.intents[i] = -1; this.selected[i] = 0;
        this.pathIds[i] = -1; this.roadEdgeIds[i] = -1; this.pathNodeIndices[i] = 0; 
        this.animOffsets[i] = Math.floor(Math.random() * CONFIG.ROUGHJS.WIGGLE_FRAMES);
        this.jobIntents[i] = -1; this.jobAnchorsX[i] = x; this.jobAnchorsY[i] = y; this.jobLeashTimers[i] = 0;
        this.targetItemIds[i] = -1; this.traceTimers[i] = 0;
        this.states[i] = SprigState.IDLE; this.workTimers[i] = 0; this.targets[i] = -1; this.teams[i] = team;
        this.sprigContainers[i].x = this.positionsX[i];
        this.sprigContainers[i].y = this.positionsY[i];
        this.sprigContainers[i].visible = true;
        this.sprigBodySprites[i].tint = (team === 1) ? 0x808080 : CONFIG.SPRIG_COLOR;
        this.cargoSprites[i].visible = false; 
        this.selectionSprites[i].visible = false;
        this.activeSprigCount++;
    }
    
    public update(ticker: Ticker) {
        const dt = ticker.deltaTime; 
        this.globalTime += dt / 60; 
        this.updateSpatialHash();
        for (let i = 0; i < this.activeSprigCount; i++) { 
            if (this.pathIds[i] !== -1) {
                this.applyPathMovement(i, this.pathIds[i]);
            } else if (this.teams[i] === 1) {
                this.applyInvaderLogic(i);
                if (i >= this.activeSprigCount) { i--; continue; } 
            } else if (this.mapSystem.getMode() === MapShape.ANT_ROOM) {
                this.updateEusocial(i, dt);
            } else {
                this.checkContext(i, dt);
                this.executeState(i, dt);
            }
            this.updatePosition(i, dt);
            this.updateVisuals(i);
        }
    }

    private updateEusocial(i: number, dt: number) {
        const px = this.positionsX[i], py = this.positionsY[i];

        // 1. Hauling (Goal: Home)
        if (this.cargos[i] !== 0) {
            this.states[i] = SprigState.HAULING;
            const nestPos = this.resourceSystem.getNestPosition();
            this.seek(i, nestPos.x, nestPos.y, 1.0);
            this.traceTimers[i] -= dt / 60;
            if (this.traceTimers[i] <= 0) {
                this.traceSystem.addTrace(px, py, TraceType.FOOD, 100, 15.0, this.velocitiesX[i], this.velocitiesY[i]);
                this.traceTimers[i] = 0.5;
            }
            const dx = nestPos.x - px, dy = nestPos.y - py;
            if (dx*dx + dy*dy < 30*30) {
                this.cargos[i] = 0;
                this.resourceSystem.feedCastle(1);
            }
            return;
        }

        // 2. Retrieving (Goal: Claimed Item)
        if (this.targetItemIds[i] !== -1) {
            this.states[i] = SprigState.RETRIEVING;
            const item = this.itemSystem.getItem(this.targetItemIds[i]);
            if (!item) {
                this.targetItemIds[i] = -1;
            } else {
                this.seek(i, item.x, item.y, 1.0);
                const dx = item.x - px, dy = item.y - py;
                if (dx*dx + dy*dy < CONFIG.HARVEST_RADIUS**2) {
                    if (this.itemSystem.removeItem(item.id)) {
                        this.cargos[i] = 1;
                        this.targetItemIds[i] = -1;
                    } else {
                        this.targetItemIds[i] = -1;
                    }
                }
            }
            return;
        }

        // 3. Harvesting (Goal: Extraction)
        if (this.states[i] === SprigState.HARVESTING) {
            this.velocitiesX[i] = 0; this.velocitiesY[i] = 0;
            this.workTimers[i] -= dt/60;
            if (this.workTimers[i] <= 0) {
                if (this.resourceSystem.damageStructure(StructureType.COOKIE, px, py, 10)) {
                    this.itemSystem.spawnCrumb(px + (Math.random()-0.5)*20, py + (Math.random()-0.5)*20);
                }
                this.states[i] = SprigState.IDLE;
            }
            return;
        }

        // 4. Scavenging (Goal: Find Item)
        const nearestItem = this.itemSystem.getNearestItem(px, py, CONFIG.DETECTION_RADIUS, true); 
        if (nearestItem) {
            if (this.itemSystem.claimItem(nearestItem.id, i)) {
                this.targetItemIds[i] = nearestItem.id;
                this.states[i] = SprigState.RETRIEVING;
                return;
            }
        }

        // 5. Scouting (Goal: Find Resource)
        const nearestSource = this.resourceSystem.getNearestSource(px, py, CONFIG.DETECTION_RADIUS);
        if (nearestSource) {
            const dx = nearestSource.x - px, dy = nearestSource.y - py, dSq = dx*dx + dy*dy;
            if (dSq < CONFIG.HARVEST_RADIUS**2) {
                this.states[i] = SprigState.HARVESTING;
                this.workTimers[i] = 1.0;
                this.velocitiesX[i] = 0; this.velocitiesY[i] = 0;
            } else {
                this.seek(i, nearestSource.x, nearestSource.y, 1.0);
                this.states[i] = SprigState.IDLE;
            }
            return;
        }

        // 6. Navigation (Goal: Follow Traces)
        const nearbyTraces = this.traceSystem.getNearbyTraces(px, py, TraceType.FOOD, 60);
        if (nearbyTraces.length > 0) {
            let sumVx = 0, sumVy = 0;
            for (let j = 0; j < nearbyTraces.length; j++) {
                sumVx += nearbyTraces[j].vx;
                sumVy += nearbyTraces[j].vy;
            }
            const avgVx = sumVx / nearbyTraces.length, avgVy = sumVy / nearbyTraces.length;
            const flowLenSq = avgVx * avgVx + avgVy * avgVy;
            if (flowLenSq > 0.01) {
                const flowLen = Math.sqrt(flowLenSq);
                const speed = CONFIG.MAX_SPEED;
                this.velocitiesX[i] = (-avgVx / flowLen) * speed;
                this.velocitiesY[i] = (-avgVy / flowLen) * speed;
            } else {
                const first = nearbyTraces[0];
                const r = first.radius * 0.5;
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * r;
                this.seek(i, first.x + Math.cos(angle) * dist, first.y + Math.sin(angle) * dist, 0.5);
            }
            this.states[i] = SprigState.IDLE;
            return;
        }

        // 7. Wandering (Goal: Stay near Nest)
        this.states[i] = SprigState.IDLE;
        this.workTimers[i] -= dt/60;
        if (this.workTimers[i] <= 0) {
            const nestPos = this.resourceSystem.getNestPosition();
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 800; 
            this.jobAnchorsX[i] = nestPos.x + Math.cos(angle) * r;
            this.jobAnchorsY[i] = nestPos.y + Math.sin(angle) * r;
            this.workTimers[i] = 1.0 + Math.random() * 2.0; 
        }
        this.seek(i, this.jobAnchorsX[i], this.jobAnchorsY[i], 0.5); 
        this.applyBoids(i, dt);
    }

    private checkContext(i: number, dt: number) {
        if (this.cargos[i] !== 0) { this.states[i] = SprigState.HAULING; return; }
        if (this.states[i] === SprigState.IDLE) {
             const item = this.itemSystem.getNearestItem(this.positionsX[i], this.positionsY[i], CONFIG.PERCEPTION_RADIUS * 3);
             if (item) { this.states[i] = SprigState.RETRIEVING; this.targets[i] = item.id; return; }
        }
        const x = this.positionsX[i], y = this.positionsY[i];
        const intent = this.flowFieldSystem.getIntentAt(x, y);
        if (intent !== null) {
            this.jobIntents[i] = intent; this.jobAnchorsX[i] = x; this.jobAnchorsY[i] = y; this.jobLeashTimers[i] = 0;
        } else if (this.jobIntents[i] !== -1) {
            this.jobLeashTimers[i] += dt / 60;
            if (this.jobLeashTimers[i] > 5.0) { this.jobIntents[i] = -1; }
            else { this.states[i] = SprigState.RETURNING; this.intents[i] = this.jobIntents[i]; return; }
        }
        this.intents[i] = intent !== null ? intent : -1;
        if (this.cargos[i] === 0 && intent === TaskIntent.GREEN_HARVEST) {
            if (this.states[i] === SprigState.IDLE && this.workTimers[i] > 0) return; 
            if (this.states[i] === SprigState.HARVESTING) return;
            if (this.resourceSystem.isNearSource(x, y, CONFIG.PERCEPTION_RADIUS)) { this.states[i] = SprigState.HARVESTING; this.workTimers[i] = 4.0; return; }
        }
        if (intent === TaskIntent.RED_ATTACK) { this.states[i] = SprigState.FIGHTING; return; }
        this.states[i] = SprigState.IDLE;
    }

    private executeState(i: number, dt: number) {
        switch(this.states[i]) {
            case SprigState.IDLE:
                if (this.workTimers[i] > 0) this.workTimers[i] -= dt / 60;
                this.applyBoids(i, dt); this.applyFlowField(i, dt);
                if (this.intents[i] === TaskIntent.GREEN_HARVEST) { this.velocitiesX[i] += (Math.random() - 0.5) * 0.5; this.velocitiesY[i] += (Math.random() - 0.5) * 0.5; }
                break;
            case SprigState.RETRIEVING:
                const item = this.itemSystem.getItem(this.targets[i]);
                if (!item) { this.states[i] = SprigState.IDLE; }
                else {
                     this.seek(i, item.x, item.y, 1.0);
                     const dx = item.x - this.positionsX[i], dy = item.y - this.positionsY[i];
                     if (dx*dx + dy*dy < 25) { 
                         if (this.itemSystem.removeItem(this.targets[i])) { this.cargos[i] = 1; this.states[i] = SprigState.HAULING; this.roadEdgeIds[i] = -1; this.pathNodeIndices[i] = 0; }
                         else { this.states[i] = SprigState.IDLE; }
                     }
                }
                break;
            case SprigState.HAULING:
                if (!this.applyStickyRoadMovement(i)) {
                    const heart = this.resourceSystem.getCastlePosition();
                    this.seek(i, heart.x, heart.y, 1.0);
                    const hx = heart.x - this.positionsX[i], hy = heart.y - this.positionsY[i];
                    if (hx*hx + hy*hy < 900) { this.cargos[i] = 0; this.states[i] = SprigState.IDLE; this.resourceSystem.feedCastle(10); }
                }
                break;
            case SprigState.HARVESTING:
                this.velocitiesX[i] = 0; this.velocitiesY[i] = 0;
                this.workTimers[i] -= dt / 60;
                if (this.workTimers[i] <= 0) {
                    this.itemSystem.spawnCrumb(this.positionsX[i], this.positionsY[i]);
                    this.states[i] = SprigState.IDLE; this.workTimers[i] = 1.0; 
                    this.velocitiesX[i] = (Math.random() - 0.5) * CONFIG.MAX_SPEED; this.velocitiesY[i] = (Math.random() - 0.5) * CONFIG.MAX_SPEED;
                }
                break;
            case SprigState.RETURNING: this.seek(i, this.jobAnchorsX[i], this.jobAnchorsY[i], 1.0); this.applyBoids(i, dt); break;
            case SprigState.FIGHTING: this.applyBoids(i, dt); break;
        }
    }

    private applyInvaderLogic(i: number) {
        const heart = this.resourceSystem.getCastlePosition();
        this.seek(i, heart.x, heart.y, 0.5);
        if (this.resourceSystem.isInsideCastle(this.positionsX[i], this.positionsY[i])) { this.resourceSystem.feedCastle(-20); this.removeSprig(i); }
    }

    private seek(idx: number, tx: number, ty: number, speedScale: number = 1.0) {
        const dx = tx - this.positionsX[idx], dy = ty - this.positionsY[idx], dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            const speed = CONFIG.MAX_SPEED * speedScale;
            this.velocitiesX[idx] = (dx / dist) * speed; this.velocitiesY[idx] = (dy / dist) * speed;
        }
    }

    private removeSprig(i: number) {
        const last = this.activeSprigCount - 1;
        if (i !== last) {
            this.positionsX[i] = this.positionsX[last]; this.positionsY[i] = this.positionsY[last];
            this.velocitiesX[i] = this.velocitiesX[last]; this.velocitiesY[i] = this.velocitiesY[last];
            this.flashTimers[i] = this.flashTimers[last]; this.cargos[i] = this.cargos[last]; this.intents[i] = this.intents[last]; this.selected[i] = this.selected[last];
            this.pathIds[i] = this.pathIds[last]; this.roadEdgeIds[i] = this.roadEdgeIds[last]; this.pathNodeIndices[i] = this.pathNodeIndices[last];
            this.animOffsets[i] = this.animOffsets[last]; this.jobIntents[i] = this.jobIntents[last]; this.jobAnchorsX[i] = this.jobAnchorsX[last]; this.jobAnchorsY[i] = this.jobAnchorsY[last];
            this.jobLeashTimers[i] = this.jobLeashTimers[last]; this.targetItemIds[i] = this.targetItemIds[last]; this.traceTimers[i] = this.traceTimers[last]; 
            this.states[i] = this.states[last]; this.workTimers[i] = this.workTimers[last]; this.targets[i] = this.targets[last]; this.teams[i] = this.teams[last];
        }
        this.sprigContainers[last].visible = false; this.activeSprigCount--;
    }

    private applyPathMovement(idx: number, pathId: number): boolean {
        const path = this.movementPathSystem.getPath(pathId);
        if (!path) { this.pathIds[idx] = -1; return false; }
        const targetIndex = this.pathNodeIndices[idx];
        if (targetIndex >= path.points.length) { this.pathIds[idx] = -1; return false; }
        const target = path.points[targetIndex], dx = target.x - this.positionsX[idx], dy = target.y - this.positionsY[idx], dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) { const speed = CONFIG.MAX_SPEED * 1.5; this.velocitiesX[idx] = (dx / dist) * speed; this.velocitiesY[idx] = (dy / dist) * speed; }
        if (dist < 10) this.pathNodeIndices[idx]++; 
        return true;
    }

    private updateSpatialHash() {
        const activeCells = this.gridCols * this.gridRows; this.gridHead.fill(-1, 0, activeCells);
        for (let i = 0; i < this.activeSprigCount; i++) {
            const cx = Math.floor(this.positionsX[i] / this.cellSize), cy = Math.floor(this.positionsY[i] / this.cellSize);
            const clx = Math.max(0, Math.min(this.gridCols - 1, cx)), cly = Math.max(0, Math.min(this.gridRows - 1, cy));
            const cellIndex = cly * this.gridCols + clx;
            this.gridNext[i] = this.gridHead[cellIndex]; this.gridHead[cellIndex] = i;
        }
    }

    private applyStickyRoadMovement(idx: number): boolean {
        let edgeId = this.roadEdgeIds[idx];
        if (edgeId === -1) {
            const edge = this.graphSystem.getNearestEdge(this.positionsX[idx], this.positionsY[idx], 40); 
            if (edge) { this.roadEdgeIds[idx] = edgeId = edge.id; this.pathNodeIndices[idx] = this.findClosestPointIndex(edge.points, this.positionsX[idx], this.positionsY[idx]); }
            else return false; 
        }
        const edge = this.graphSystem.getEdge(edgeId);
        if (!edge || !edge.points || edge.points.length === 0 || this.pathNodeIndices[idx] >= edge.points.length) { this.roadEdgeIds[idx] = -1; return false; }
        const pt = edge.points[this.pathNodeIndices[idx]];
        const tx = pt.gx * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2, ty = pt.gy * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2;
        const dx = tx - this.positionsX[idx], dy = ty - this.positionsY[idx], dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) { const speed = CONFIG.MAX_SPEED * 1.5; this.velocitiesX[idx] = (dx / dist) * speed; this.velocitiesY[idx] = (dy / dist) * speed; }
        if (dist < 10) this.pathNodeIndices[idx]++;
        return true;
    }

    private findClosestPointIndex(points: {gx: number, gy: number}[], x: number, y: number): number {
        let bestDist = Infinity, bestIdx = 0;
        for(let i=0; i<points.length; i++) {
            const px = points[i].gx * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2, py = points[i].gy * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2;
            const d = (px-x)**2 + (py-y)**2; if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        return bestIdx;
    }

    private applyFlowField(idx: number, dt: number) {
        const { vx, vy, intent } = this.flowFieldSystem.applyFlow(this.positionsX[idx], this.positionsY[idx], this.velocitiesX[idx], this.velocitiesY[idx], dt);
        this.velocitiesX[idx] = vx; this.velocitiesY[idx] = vy;
        if (intent !== null) this.intents[idx] = intent;
    }

    private applyBoids(idx: number, dt: number) {
        let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, neighborCount = 0;
        const px = this.positionsX[idx], py = this.positionsY[idx];
        let cx = Math.floor(px / this.cellSize), cy = Math.floor(py / this.cellSize);
        const startX = Math.max(0, cx - 1), endX = Math.min(this.gridCols - 1, cx + 1);
        const startY = Math.max(0, cy - 1), endY = Math.min(this.gridRows - 1, cy + 1);
        for (let ny = startY; ny <= endY; ny++) for (let nx = startX; nx <= endX; nx++) {
            let otherIdx = this.gridHead[ny * this.gridCols + nx];
            while (otherIdx !== -1) {
                if (idx !== otherIdx) {
                    const dx = px - this.positionsX[otherIdx], dy = py - this.positionsY[otherIdx], distSq = dx * dx + dy * dy;
                    if (distSq > 0 && distSq < CONFIG.PERCEPTION_RADIUS**2) {
                        const dist = Math.sqrt(distSq); sepX += (dx / dist) / dist; sepY += (dy / dist) / dist;
                        aliX += this.velocitiesX[otherIdx]; aliY += this.velocitiesY[otherIdx];
                        cohX += this.positionsX[otherIdx]; cohY += this.positionsY[otherIdx];
                        neighborCount++;
                    }
                }
                otherIdx = this.gridNext[otherIdx];
            }
        }
        if (neighborCount > 0) {
            const aliLen = Math.sqrt(aliX * aliX + aliY * aliY); if (aliLen > 0) { aliX = (aliX / aliLen / neighborCount) * CONFIG.ALIGNMENT_FORCE; aliY = (aliY / aliLen / neighborCount) * CONFIG.ALIGNMENT_FORCE; }
            cohX = (cohX / neighborCount - px); cohY = (cohY / neighborCount - py); const cohLen = Math.sqrt(cohX * cohX + cohY * cohY); if (cohLen > 0) { cohX = (cohX / cohLen) * CONFIG.COHESION_FORCE; cohY = (cohY / cohLen) * CONFIG.COHESION_FORCE; }
            const sepLen = Math.sqrt(sepX * sepX + sepY * sepY); if (sepLen > 0) { sepX = (sepX / sepLen) * CONFIG.SEPARATION_FORCE; sepY = (sepY / sepLen) * CONFIG.SEPARATION_FORCE; }
            this.velocitiesX[idx] += (sepX + aliX + cohX) * dt; this.velocitiesY[idx] += (sepY + aliY + cohY) * dt;
        }
        if (this.resourceSystem.getSinkType() === 'NEST') {
            const nestPos = this.resourceSystem.getCastlePosition(), r = CONFIG.CASTLE_RADIUS + CONFIG.SPRIG_RADIUS + 10, rSq = r * r;
            const dx = px - nestPos.x, dy = py - nestPos.y, dSq = dx*dx + dy*dy;
            if (dSq < rSq && dSq > 0) { const dist = Math.sqrt(dSq); this.velocitiesX[idx] += (dx / dist) * 5.0; this.velocitiesY[idx] += (dy / dist) * 5.0; }
        }
    }

    private updatePosition(idx: number, dt: number) {
        let velX = this.velocitiesX[idx], velY = this.velocitiesY[idx];
        const speedSq = velX * velX + velY * velY, maxSq = CONFIG.MAX_SPEED * CONFIG.MAX_SPEED;
        if (speedSq > maxSq) { const scale = CONFIG.MAX_SPEED / Math.sqrt(speedSq); velX *= scale; velY *= scale; }
        const frictionFactor = Math.pow(CONFIG.FRICTION, dt);
        this.velocitiesX[idx] = velX * frictionFactor; this.velocitiesY[idx] = velY * frictionFactor;
        const effectiveSpeed = (this.cargos[idx] !== 0) ? CONFIG.SPRIG_CARGO_SLOWDOWN_FACTOR : 1.0;
        this.positionsX[idx] += velX * effectiveSpeed * dt; this.positionsY[idx] += velY * effectiveSpeed * dt;
        const tempPos = {x: this.positionsX[idx], y: this.positionsY[idx]}, tempVel = {x: this.velocitiesX[idx], y: this.velocitiesY[idx]};
        this.mapSystem.constrain(tempPos, tempVel, CONFIG.SPRIG_RADIUS);
        this.positionsX[idx] = tempPos.x; this.positionsY[idx] = tempPos.y; this.velocitiesX[idx] = tempVel.x; this.velocitiesY[idx] = tempVel.y;
    }

    public setSelected(idx: number, isSelected: boolean) { this.selected[idx] = isSelected ? 1 : 0; }
    public setPath(idx: number, pathId: number) { this.pathIds[idx] = pathId; this.pathNodeIndices[idx] = 0; }
    public getActivePathIds(): Set<number> { const activeIds = new Set<number>(); for (let i = 0; i < this.activeSprigCount; i++) if (this.pathIds[i] !== -1) activeIds.add(this.pathIds[i]); return activeIds; }
    public getSelectedIndices(): number[] { const indices = []; for (let i = 0; i < this.activeSprigCount; i++) if (this.selected[i] === 1) indices.push(i); return indices; }

    private updateVisuals(idx: number) {
        const container = this.sprigContainers[idx], bodySprite = this.sprigBodySprites[idx], cargoSprite = this.cargoSprites[idx], selectionRing = this.selectionSprites[idx];
        container.x = this.positionsX[idx]; container.y = this.positionsY[idx];
        const frame = Math.floor(this.globalTime * CONFIG.ROUGHJS.WIGGLE_FPS);
        bodySprite.texture = this.sprigTextures[(frame + this.animOffsets[idx]) % CONFIG.ROUGHJS.WIGGLE_FRAMES];
        selectionRing.visible = this.selected[idx] === 1;
        if (this.flashTimers[idx] > 0) { bodySprite.tint = CONFIG.SPRIG_FLASH_COLOR; this.flashTimers[idx]--; }
        else if (this.teams[idx] === 1) bodySprite.tint = 0x808080;
        else bodySprite.tint = (this.intents[idx] !== -1) ? CONFIG.INTENT_COLORS[this.intents[idx]] : CONFIG.SPRIG_COLOR;
        if (this.cargos[idx] !== 0) { 
            cargoSprite.visible = true; cargoSprite.tint = CONFIG.ITEMS.CRUMB_COLOR; cargoSprite.y = CONFIG.SPRIG_CARGO_OFFSET_Y;
            const sy = CONFIG.SPRIG_SQUASH_Y_WITH_CARGO; bodySprite.scale.set(1.0 / sy, sy);
        } else { cargoSprite.visible = false; bodySprite.scale.set(1.0, 1.0); }
    }
    
    public isSprigActive(idx: number): boolean { return idx < this.activeSprigCount; }
    public isPlayer(idx: number): boolean { return this.teams[idx] === 0; }
    public isCarrying(idx: number): boolean { return this.cargos[idx] !== 0; }
    public setCargo(idx: number, cargoType: number) { this.cargos[idx] = cargoType; }
    public getSprigBounds(idx: number): {x: number, y: number, radius: number} { return { x: this.positionsX[idx], y: this.positionsY[idx], radius: CONFIG.SPRIG_RADIUS }; }
    public getSprigsAt(x: number, y: number, radius: number): number[] {
        const rSq = radius * radius, indices: number[] = [];
        const startX = Math.max(0, Math.floor((x - radius) / this.cellSize)), endX = Math.min(this.gridCols - 1, Math.floor((x + radius) / this.cellSize));
        const startY = Math.max(0, Math.floor((y - radius) / this.cellSize)), endY = Math.min(this.gridRows - 1, Math.floor((y + radius) / this.cellSize));
        for (let cy = startY; cy <= endY; cy++) for (let cx = startX; cx <= endX; cx++) {
            let i = this.gridHead[cy * this.gridCols + cx];
            while (i !== -1) {
                const dx = this.positionsX[i] - x, dy = this.positionsY[i] - y;
                if (dx * dx + dy * dy < rSq) indices.push(i);
                i = this.gridNext[i];
            }
        }
        return indices;
    }
    public getSprigAt(x: number, y: number, radius: number = CONFIG.SPRIG_RADIUS): number {
        const rSq = radius * radius; let bestDistSq = rSq, bestIdx = -1;
        const startX = Math.max(0, Math.floor((x - radius) / this.cellSize)), endX = Math.min(this.gridCols - 1, Math.floor((x + radius) / this.cellSize));
        const startY = Math.max(0, Math.floor((y - radius) / this.cellSize)), endY = Math.min(this.gridRows - 1, Math.floor((y + radius) / this.cellSize));
        for (let cy = startY; cy <= endY; cy++) for (let cx = startX; cx <= endX; cx++) {
            let i = this.gridHead[cy * this.gridCols + cx];
            while (i !== -1) {
                const dx = this.positionsX[i] - x, dy = this.positionsY[i] - y, dSq = dx * dx + dy * dy;
                if (dSq < bestDistSq) { bestDistSq = dSq; bestIdx = i; }
                i = this.gridNext[i];
            }
        }
        return bestIdx;
    }
    public removeSprigsAt(x: number, y: number, radius: number) {
        const rSq = radius * radius, toRemove: number[] = [];
        const startX = Math.max(0, Math.floor((x - radius) / this.cellSize)), endX = Math.min(this.gridCols - 1, Math.floor((x + radius) / this.cellSize));
        const startY = Math.max(0, Math.floor((y - radius) / this.cellSize)), endY = Math.min(this.gridRows - 1, Math.floor((y + radius) / this.cellSize));
        for (let cy = startY; cy <= endY; cy++) for (let cx = startX; cx <= endX; cx++) {
            let i = this.gridHead[cy * this.gridCols + cx];
            while (i !== -1) {
                const dx = this.positionsX[i] - x, dy = this.positionsY[i] - y;
                if (dx * dx + dy * dy < rSq) toRemove.push(i);
                i = this.gridNext[i];
            }
        }
        if (toRemove.length === 0) return;
        toRemove.sort((a, b) => b - a);
        for (const idx of toRemove) if (idx < this.activeSprigCount) this.removeSprig(idx);
    }
    public clearAll() { this.activeSprigCount = 0; for(const container of this.sprigContainers) container.visible = false; }
}