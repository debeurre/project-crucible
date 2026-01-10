import { Structure, StructureType, getStructureStats } from '../data/StructureData';
import { CONFIG } from './Config';

export class Grid {
    public cols: number;
    public rows: number;
    public data: Uint8Array;

    constructor(worldWidth: number, worldHeight: number) {
        const pxWidth = worldWidth * CONFIG.GRID_SIZE;
        const pxHeight = worldHeight * CONFIG.GRID_SIZE;
        
        this.cols = Math.ceil(pxWidth / CONFIG.GRID_SIZE);
        this.rows = Math.ceil(pxHeight / CONFIG.GRID_SIZE);
        
        this.data = new Uint8Array(this.cols * this.rows);
    }

    public getCol(x: number): number {
        return Math.floor(x / CONFIG.GRID_SIZE);
    }

    public getRow(y: number): number {
        return Math.floor(y / CONFIG.GRID_SIZE);
    }

    public isValid(col: number, row: number): boolean {
        return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
    }

    public bake(structures: Structure[]): void {
        this.data.fill(0);

        for (const s of structures) {
            const stats = getStructureStats(s.type);
            // Include Nest and Cookie as obstacles for now? Or just Rocks?
            if (s.type === StructureType.ROCK || s.type === StructureType.NEST || s.type === StructureType.COOKIE) {
                const cx = Math.floor(s.x / CONFIG.GRID_SIZE);
                const cy = Math.floor(s.y / CONFIG.GRID_SIZE);
                const r = Math.ceil(stats.radius / CONFIG.GRID_SIZE);

                for (let y = cy - r; y <= cy + r; y++) {
                    for (let x = cx - r; x <= cx + r; x++) {
                        if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                            const tileCenterX = x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE/2;
                            const tileCenterY = y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE/2;
                            const dx = tileCenterX - s.x;
                            const dy = tileCenterY - s.y;
                            
                            if (dx*dx + dy*dy < stats.radius * stats.radius) {
                                this.data[y * this.cols + x] = 1;
                            }
                        }
                    }
                }
            }
        }
    }

    public isWalkable(worldX: number, worldY: number): boolean {
        const gx = Math.floor(worldX / CONFIG.GRID_SIZE);
        const gy = Math.floor(worldY / CONFIG.GRID_SIZE);

        if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return false;
        return this.data[gy * this.cols + gx] === 0;
    }
    
    // Helper for pathfinder using grid coords
    public isBlocked(gx: number, gy: number): boolean {
        if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return true;
        return this.data[gy * this.cols + gx] === 1;
    }
}