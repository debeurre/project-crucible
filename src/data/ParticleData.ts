export const ParticleType = {
    TEXT: 0,
    ICON: 1,
    CIRCLE: 2,
    SPARK: 3
};

export class ParticleData {
    public x: Float32Array;
    public y: Float32Array;
    public vx: Float32Array;
    public vy: Float32Array;
    public life: Float32Array;
    public maxLife: Float32Array;
    public scale: Float32Array;
    public ownerId: Int32Array;
    public type: Uint8Array;
    public color: Int32Array; // Hex
    public active: Uint8Array;
    
    // Non-SoA storage for strings
    public textContent: Map<number, string>;

    public count: number;
    public readonly CAPACITY = 2000;

    constructor() {
        this.x = new Float32Array(this.CAPACITY);
        this.y = new Float32Array(this.CAPACITY);
        this.vx = new Float32Array(this.CAPACITY);
        this.vy = new Float32Array(this.CAPACITY);
        this.life = new Float32Array(this.CAPACITY);
        this.maxLife = new Float32Array(this.CAPACITY);
        this.scale = new Float32Array(this.CAPACITY);
        this.ownerId = new Int32Array(this.CAPACITY).fill(-1);
        this.type = new Uint8Array(this.CAPACITY);
        this.color = new Int32Array(this.CAPACITY);
        this.active = new Uint8Array(this.CAPACITY);
        
        this.textContent = new Map();
        this.count = 0;
    }

    public spawn(x: number, y: number, type: number, life: number): number {
        // Simple linear scan
        for (let i = 0; i < this.CAPACITY; i++) {
            if (this.active[i] === 0) {
                this.active[i] = 1;
                this.x[i] = x;
                this.y[i] = y;
                this.vx[i] = 0;
                this.vy[i] = 0;
                this.life[i] = life;
                this.maxLife[i] = life;
                this.scale[i] = 1.0;
                this.ownerId[i] = -1;
                this.type[i] = type;
                this.color[i] = 0xFFFFFF;
                this.textContent.delete(i); // Clear old text
                this.count++;
                return i;
            }
        }
        return -1;
    }

    public remove(i: number) {
        if (this.active[i]) {
            this.active[i] = 0;
            this.textContent.delete(i);
            this.count--;
        }
    }
}
