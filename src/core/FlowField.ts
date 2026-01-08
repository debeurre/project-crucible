import { CONFIG } from './Config';

export class FlowField {
    public width: number;
    public height: number;
    public field: Float32Array;
    public resolution: number;

    constructor(worldWidthTiles: number, worldHeightTiles: number) {
        this.resolution = CONFIG.GRID_SIZE; 
        const pxWidth = worldWidthTiles * CONFIG.TILE_SIZE;
        const pxHeight = worldHeightTiles * CONFIG.TILE_SIZE;
        
        this.width = Math.ceil(pxWidth / this.resolution);
        this.height = Math.ceil(pxHeight / this.resolution);
        
        this.field = new Float32Array(this.width * this.height * 2);
    }

    public addVector(worldX: number, worldY: number, vx: number, vy: number): void {
        const gx = Math.floor(worldX / this.resolution);
        const gy = Math.floor(worldY / this.resolution);
        
        if (gx >= 0 && gx < this.width && gy >= 0 && gy < this.height) {
            const idx = (gy * this.width + gx) * 2;
            
            // Blend: lerp(current, new, 0.1)
            const currentVx = this.field[idx];
            const currentVy = this.field[idx + 1];
            
            let newVx = currentVx + (vx - currentVx) * 0.1;
            let newVy = currentVy + (vy - currentVy) * 0.1;
            
            // Normalize/Cap length at 1.0
            const lenSq = newVx * newVx + newVy * newVy;
            if (lenSq > 1.0) {
                const len = Math.sqrt(lenSq);
                newVx /= len;
                newVy /= len;
            }
            
            this.field[idx] = newVx;
            this.field[idx + 1] = newVy;
        }
    }

    public getVector(worldX: number, worldY: number): { x: number, y: number } {
        const gx = Math.floor(worldX / this.resolution);
        const gy = Math.floor(worldY / this.resolution);
        
        if (gx >= 0 && gx < this.width && gy >= 0 && gy < this.height) {
            const idx = (gy * this.width + gx) * 2;
            return { x: this.field[idx], y: this.field[idx + 1] };
        }
        return { x: 0, y: 0 };
    }

    public decay(rate: number = 0.98): void {
        for (let i = 0; i < this.field.length; i++) {
            this.field[i] *= rate;
            // Optimization: Snap to zero if very small
            if (Math.abs(this.field[i]) < 0.001) this.field[i] = 0;
        }
    }
}
