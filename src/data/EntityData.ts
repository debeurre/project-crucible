import { CONFIG } from '../core/Config';

export class EntityData {
    public x: Float32Array;
    public y: Float32Array;
    public vx: Float32Array;
    public vy: Float32Array;
    public active: Uint8Array;
    public count: number;

    constructor() {
        const size = CONFIG.MAX_SPRIGS;
        this.x = new Float32Array(size);
        this.y = new Float32Array(size);
        this.vx = new Float32Array(size);
        this.vy = new Float32Array(size);
        this.active = new Uint8Array(size);
        this.count = 0;
    }

    public spawn(startX: number, startY: number): number {
        for (let i = 0; i < this.active.length; i++) {
            if (this.active[i] === 0) {
                this.x[i] = startX;
                this.y[i] = startY;
                this.vx[i] = 0;
                this.vy[i] = 0;
                this.active[i] = 1;
                this.count++;
                return i;
            }
        }
        return -1;
    }
}
