import { EntityData } from '../data/EntityData';
import { CONFIG } from './Config';

export class SpatialHash {
    private cellSize: number;
    private cols: number;
    private rows: number;
    private grid: Int32Array[]; // Dynamic arrays of indices

    constructor(cellSize: number) {
        this.cellSize = cellSize;
        this.cols = Math.ceil((CONFIG.GRID_SIZE * CONFIG.WORLD_WIDTH) / cellSize);
        this.rows = Math.ceil((CONFIG.GRID_SIZE * CONFIG.WORLD_HEIGHT) / cellSize);
        this.grid = new Array(this.cols * this.rows);
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = new Int32Array(0); // Start empty
        }
    }

    public update(sprigs: EntityData) {
        // Clear grid
        // Instead of allocating new arrays, we could use a 'count' array and a fixed large buffer, 
        // but for <500 entities, simple JS arrays or reallocating small typed arrays is fine.
        // Let's use simple JS arrays for buckets to avoid complex memory management in this prototype phase.
        const buckets: number[][] = new Array(this.cols * this.rows);
        for (let i = 0; i < buckets.length; i++) buckets[i] = [];

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;

            const col = Math.floor(sprigs.x[i] / this.cellSize);
            const row = Math.floor(sprigs.y[i] / this.cellSize);

            if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                const idx = row * this.cols + col;
                buckets[idx].push(i);
            }
        }

        // Flatten to TypedArrays for cache friendliness during query? 
        // Actually, returning number[] from query is easier for the consumer.
        // Let's stick to number[][] for the grid storage for now.
        this.grid = buckets.map(b => new Int32Array(b));
    }

    public query(x: number, y: number, radius: number): number[] {
        const result: number[] = [];
        
        const minCol = Math.floor((x - radius) / this.cellSize);
        const maxCol = Math.floor((x + radius) / this.cellSize);
        const minRow = Math.floor((y - radius) / this.cellSize);
        const maxRow = Math.floor((y + radius) / this.cellSize);

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
                    const idx = r * this.cols + c;
                    const bucket = this.grid[idx];
                    for (let i = 0; i < bucket.length; i++) {
                         result.push(bucket[i]);
                    }
                }
            }
        }

        return result;
    }
}
