export const MAX_PATHS = 10;
export const MAX_POINTS_PER_PATH = 100;

export class PathData {
    public active: Uint8Array;
    public pointsX: Float32Array;
    public pointsY: Float32Array;
    public pointsCount: Int32Array;
    
    constructor() {
        this.active = new Uint8Array(MAX_PATHS);
        this.pointsX = new Float32Array(MAX_PATHS * MAX_POINTS_PER_PATH);
        this.pointsY = new Float32Array(MAX_PATHS * MAX_POINTS_PER_PATH);
        this.pointsCount = new Int32Array(MAX_PATHS);
    }

    public add(points: {x: number, y: number}[]): number {
        let slot = -1;
        for (let i = 0; i < MAX_PATHS; i++) {
            if (this.active[i] === 0) {
                slot = i;
                break;
            }
        }

        if (slot === -1) return -1;

        const count = Math.min(points.length, MAX_POINTS_PER_PATH);
        this.active[slot] = 1;
        this.pointsCount[slot] = count;
        
        const offset = slot * MAX_POINTS_PER_PATH;
        for (let i = 0; i < count; i++) {
            this.pointsX[offset + i] = points[i].x;
            this.pointsY[offset + i] = points[i].y;
        }

        return slot;
    }

    public remove(id: number) {
        if (id < 0 || id >= MAX_PATHS) return;
        this.active[id] = 0;
        this.pointsCount[id] = 0;
    }

    public getPoint(pathId: number, pointIdx: number): {x: number, y: number} | null {
        if (pathId < 0 || pathId >= MAX_PATHS || this.active[pathId] === 0) return null;
        if (pointIdx < 0 || pointIdx >= this.pointsCount[pathId]) return null;
        
        const offset = pathId * MAX_POINTS_PER_PATH;
        return {
            x: this.pointsX[offset + pointIdx],
            y: this.pointsY[offset + pointIdx]
        };
    }
}
