import { Structure } from '../data/StructureData';
import { CONFIG } from './Config';

export class StructureHash {
    private cellSize: number;
    private cols: number;
    private rows: number;
    private grid: Structure[][];

    constructor(cellSize: number) {
        this.cellSize = cellSize;
        this.cols = Math.ceil((CONFIG.GRID_SIZE * CONFIG.WORLD_WIDTH) / cellSize);
        this.rows = Math.ceil((CONFIG.GRID_SIZE * CONFIG.WORLD_HEIGHT) / cellSize);
        this.grid = new Array(this.cols * this.rows);
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = [];
        }
    }

    public add(structure: Structure) {
        const col = Math.floor(structure.x / this.cellSize);
        const row = Math.floor(structure.y / this.cellSize);

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const idx = row * this.cols + col;
            this.grid[idx].push(structure);
        }
    }

    public remove(structure: Structure) {
        const col = Math.floor(structure.x / this.cellSize);
        const row = Math.floor(structure.y / this.cellSize);

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const idx = row * this.cols + col;
            const bucket = this.grid[idx];
            const index = bucket.indexOf(structure);
            if (index !== -1) {
                bucket.splice(index, 1);
            }
        }
    }

    public query(x: number, y: number, radius: number): Structure[] {
        const result: Structure[] = [];
        const rSq = radius * radius;
        
        const minCol = Math.floor((x - radius) / this.cellSize);
        const maxCol = Math.floor((x + radius) / this.cellSize);
        const minRow = Math.floor((y - radius) / this.cellSize);
        const maxRow = Math.floor((y + radius) / this.cellSize);

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
                    const idx = r * this.cols + c;
                    const bucket = this.grid[idx];
                    for (const s of bucket) {
                        const dx = s.x - x;
                        const dy = s.y - y;
                        if (dx*dx + dy*dy <= rSq) {
                            result.push(s);
                        }
                    }
                }
            }
        }

        return result;
    }
    
    public clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = [];
        }
    }
}
