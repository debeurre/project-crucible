import { CONFIG } from '../core/Config';
import { SprigState } from './SprigState';
import { Stock } from '../components/Stock';

export const EntityType = {
    SPRIG: 0,
    THIEF: 1
};

export class EntityData {
    public x: Float32Array;
    public y: Float32Array;
    public vx: Float32Array;
    public vy: Float32Array;
    public ax: Float32Array;
    public ay: Float32Array;
    public avoidAx: Float32Array;
    public avoidAy: Float32Array;
    public debugAx: Float32Array;
    public debugAy: Float32Array;
    public active: Uint8Array;
    public type: Uint8Array;
    public state: Uint8Array;
    public stock: Stock[];
    public targetX: Float32Array;
    public targetY: Float32Array;
    public homeID: Int32Array;
    public targetId: Int32Array;
    public jobId: Int32Array;
    public pathId: Int32Array;
    public pathTargetIdx: Int32Array;
    public timer: Float32Array;
    public speed: Float32Array;
    public feedTimer: Float32Array;
    public hungerState: Uint8Array;
    public selected: Uint8Array;
    
    // Combat Stats
    public hp: Int32Array;
    public maxHp: Int32Array;
    public prevHp: Int32Array;
    public attack: Int32Array;
    public defense: Int32Array;

    // Progression Stats
    public xp_haul: Int32Array;
    public xp_fight: Int32Array;
    public level_haul: Int32Array;
    public level_fight: Int32Array;

    public count: number;
    
    // Memory
    public discoveryBuffer: Int32Array;
    public discoveryCount: Uint8Array;
    public readonly MEMORY_CAPACITY = 4;

    constructor() {
        const size = CONFIG.MAX_SPRIGS;
        this.x = new Float32Array(size);
        this.y = new Float32Array(size);
        this.vx = new Float32Array(size);
        this.vy = new Float32Array(size);
        this.ax = new Float32Array(size);
        this.ay = new Float32Array(size);
        this.avoidAx = new Float32Array(size);
        this.avoidAy = new Float32Array(size);
        this.debugAx = new Float32Array(size);
        this.debugAy = new Float32Array(size);
        this.active = new Uint8Array(size);
        this.type = new Uint8Array(size);
        this.state = new Uint8Array(size);
        this.stock = Array.from({ length: size }, () => new Stock(5));
        this.targetX = new Float32Array(size);
        this.targetY = new Float32Array(size);
        this.homeID = new Int32Array(size).fill(-1);
        this.targetId = new Int32Array(size).fill(-1);
        this.jobId = new Int32Array(size).fill(-1);
        this.pathId = new Int32Array(size).fill(-1);
        this.pathTargetIdx = new Int32Array(size).fill(-1);
        this.timer = new Float32Array(size);
        this.speed = new Float32Array(size);
        this.feedTimer = new Float32Array(size);
        this.hungerState = new Uint8Array(size);
        this.selected = new Uint8Array(size);
        
        this.hp = new Int32Array(size);
        this.maxHp = new Int32Array(size);
        this.prevHp = new Int32Array(size);
        this.attack = new Int32Array(size);
        this.defense = new Int32Array(size);
        this.xp_haul = new Int32Array(size);
        this.xp_fight = new Int32Array(size);
        this.level_haul = new Int32Array(size);
        this.level_fight = new Int32Array(size);
        
        this.discoveryBuffer = new Int32Array(size * this.MEMORY_CAPACITY).fill(-1);
        this.discoveryCount = new Uint8Array(size);
        
        this.count = 0;
    }

    public addDiscovery(sprigId: number, structureId: number) {
        if (this.discoveryCount[sprigId] < this.MEMORY_CAPACITY) {
            // Check for duplicates in current memory
            const start = sprigId * this.MEMORY_CAPACITY;
            for(let i=0; i<this.discoveryCount[sprigId]; i++) {
                if (this.discoveryBuffer[start + i] === structureId) return;
            }
            
            this.discoveryBuffer[start + this.discoveryCount[sprigId]] = structureId;
            this.discoveryCount[sprigId]++;
        }
    }

    public clearDiscoveries(sprigId: number) {
        this.discoveryCount[sprigId] = 0;
    }

    public spawn(startX: number, startY: number, type: number = EntityType.SPRIG): number {
        for (let i = 0; i < this.active.length; i++) {
            if (this.active[i] === 0) {
                this.x[i] = startX;
                this.y[i] = startY;
                this.vx[i] = 0;
                this.vy[i] = 0;
                this.ax[i] = 0;
                this.ay[i] = 0;
                this.avoidAx[i] = 0;
                this.avoidAy[i] = 0;
                this.active[i] = 1;
                this.type[i] = type;
                this.state[i] = SprigState.IDLE; 
                this.stock[i].remove('FOOD', this.stock[i].count('FOOD')); // Clear stock
                this.targetX[i] = startX;
                this.targetY[i] = startY;
                this.homeID[i] = -1;
                this.targetId[i] = -1;
                this.jobId[i] = -1;
                this.pathId[i] = -1;
                this.pathTargetIdx[i] = -1;
                this.timer[i] = 0;
                this.speed[i] = CONFIG.MAX_SPEED;
                this.feedTimer[i] = CONFIG.HUNGER_INTERVAL;
                this.hungerState[i] = 0;
                this.selected[i] = 0;
                this.discoveryCount[i] = 0;

                // Initialize Stats
                this.maxHp[i] = CONFIG.BASE_HP;
                this.hp[i] = CONFIG.BASE_HP;
                this.prevHp[i] = CONFIG.BASE_HP;
                this.attack[i] = CONFIG.BASE_ATTACK;
                this.defense[i] = CONFIG.BASE_DEFENSE;
                this.xp_haul[i] = 0;
                this.xp_fight[i] = 0;
                this.level_haul[i] = 0;
                this.level_fight[i] = 0;

                this.count++;
                return i;
            }
        }
        return -1;
    }

    public getSprigAt(x: number, y: number, radius: number): number {
        const rSq = radius * radius;
        for (let i = 0; i < this.active.length; i++) {
            if (this.active[i] === 0) continue;
            const dx = this.x[i] - x;
            const dy = this.y[i] - y;
            if (dx * dx + dy * dy < rSq) {
                return i;
            }
        }
        return -1;
    }
}