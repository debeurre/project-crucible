import { CONFIG } from '../core/Config';

export const Terrain = {
    VOID: 0,
    GRASS: 1,
    MUD: 2,
    WATER: 3
};

export class MapData {
    public width: number;
    public height: number;
    public tiles: Uint8Array;
    public scents: Float32Array;
    public roads: Float32Array;
    public terrain: Uint8Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.tiles = new Uint8Array(width * height);
        this.scents = new Float32Array(width * height);
        this.roads = new Float32Array(width * height);
        this.terrain = new Uint8Array(width * height);
    }

    public getIndex(x: number, y: number): number {
        return y * this.width + x;
    }

    public isWalkable(x: number, y: number): boolean {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        // 0 = Empty/Walkable, 1 = Wall/Obstacle
        return this.tiles[this.getIndex(x, y)] === 0;
    }

    public isBlocked(col: number, row: number, canSwim: boolean): boolean {
        if (col < 0 || col >= this.width || row < 0 || row >= this.height) return true;
        const index = this.getIndex(col, row);
        const val = this.terrain[index];
        if (val === Terrain.VOID) return true;
        if (val === Terrain.WATER && !canSwim) return true;
        return false;
    }



    public addScent(worldX: number, worldY: number, amount: number) {
        const gx = Math.floor(worldX / CONFIG.GRID_SIZE);
        const gy = Math.floor(worldY / CONFIG.GRID_SIZE);
        
        if (gx >= 0 && gx < this.width && gy >= 0 && gy < this.height) {
            const index = this.getIndex(gx, gy);
            this.scents[index] = Math.min(1.0, this.scents[index] + amount);
        }
    }

    public getScent(gx: number, gy: number): number {
        if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) return 0;
        return this.scents[this.getIndex(gx, gy)] || 0;
    }

    public getRoad(worldX: number, worldY: number): number {
        const gx = Math.floor(worldX / CONFIG.GRID_SIZE);
        const gy = Math.floor(worldY / CONFIG.GRID_SIZE);
        if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) return 0;
        return this.roads[this.getIndex(gx, gy)] || 0;
    }
}
