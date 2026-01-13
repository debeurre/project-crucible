import { CONFIG } from '../core/Config';
import { SprigState } from './SprigState';
import { Stock } from '../components/Stock';

export class EntityData {
    public x: Float32Array;
    public y: Float32Array;
    public vx: Float32Array;
    public vy: Float32Array;
    public ax: Float32Array;
    public ay: Float32Array;
    public debugAx: Float32Array;
    public debugAy: Float32Array;
    public active: Uint8Array;
    public state: Uint8Array;
    public stock: Stock[];
    public targetX: Float32Array;
    public targetY: Float32Array;
    public homeID: Int32Array;
    public targetId: Int32Array;
    public jobId: Int32Array;
    public timer: Float32Array;
    public speed: Float32Array;
    public count: number;

    constructor() {
        const size = CONFIG.MAX_SPRIGS;
        this.x = new Float32Array(size);
        this.y = new Float32Array(size);
        this.vx = new Float32Array(size);
        this.vy = new Float32Array(size);
        this.ax = new Float32Array(size);
        this.ay = new Float32Array(size);
        this.debugAx = new Float32Array(size);
        this.debugAy = new Float32Array(size);
        this.active = new Uint8Array(size);
        this.state = new Uint8Array(size);
        this.stock = Array.from({ length: size }, () => new Stock(1));
        this.targetX = new Float32Array(size);
        this.targetY = new Float32Array(size);
        this.homeID = new Int32Array(size).fill(-1);
        this.targetId = new Int32Array(size).fill(-1);
        this.jobId = new Int32Array(size).fill(-1);
        this.timer = new Float32Array(size);
        this.speed = new Float32Array(size);
        this.count = 0;
    }

    public spawn(startX: number, startY: number): number {
        for (let i = 0; i < this.active.length; i++) {
            if (this.active[i] === 0) {
                this.x[i] = startX;
                this.y[i] = startY;
                this.vx[i] = 0;
                this.vy[i] = 0;
                this.ax[i] = 0;
                this.ay[i] = 0;
                this.active[i] = 1;
                this.state[i] = SprigState.IDLE; 
                this.stock[i].remove('FOOD', this.stock[i].count('FOOD')); // Clear stock
                this.targetX[i] = startX;
                this.targetY[i] = startY;
                this.homeID[i] = -1;
                this.targetId[i] = -1;
                this.jobId[i] = -1;
                this.timer[i] = 0;
                this.speed[i] = CONFIG.MAX_SPEED;
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