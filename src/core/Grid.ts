import { Structure, StructureType } from '../data/StructureData';
import { CONFIG } from './Config';

export class Grid {
    public width: number;
    public height: number;
    public cells: Uint8Array;

    constructor(worldWidth: number, worldHeight: number) {
        // worldWidth and worldHeight are in tiles (e.g. 40), but GRID_SIZE is 16.
        // Wait, worldWidth from Config is 40 tiles * 24px = 960px.
        // New Grid uses 16px tiles.
        // So grid dimensions should be ceil(worldWidthInPixels / GRID_SIZE).
        
        const pxWidth = worldWidth * CONFIG.TILE_SIZE;
        const pxHeight = worldHeight * CONFIG.TILE_SIZE;
        
        this.width = Math.ceil(pxWidth / CONFIG.GRID_SIZE);
        this.height = Math.ceil(pxHeight / CONFIG.GRID_SIZE);
        
        this.cells = new Uint8Array(this.width * this.height);
    }

    public update(structures: Structure[]): void {
        // Reset grid
        this.cells.fill(0);

        for (const s of structures) {
            if (s.type === StructureType.ROCK || s.type === StructureType.NEST || s.type === StructureType.COOKIE) {
                // Convert structure position/radius to grid cells
                const cx = Math.floor(s.x / CONFIG.GRID_SIZE);
                const cy = Math.floor(s.y / CONFIG.GRID_SIZE);
                const r = Math.ceil(s.radius / CONFIG.GRID_SIZE);

                // Simple bounding box loop for the circle
                for (let y = cy - r; y <= cy + r; y++) {
                    for (let x = cx - r; x <= cx + r; x++) {
                        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                            // Circle check
                            const dx = (x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE/2) - s.x;
                            const dy = (y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE/2) - s.y;
                            if (dx*dx + dy*dy < s.radius*s.radius) {
                                // Blocked
                                this.cells[y * this.width + x] = 1;
                            }
                        }
                    }
                }
            }
        }
    }

    public isBlocked(x: number, y: number): boolean {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
        return this.cells[y * this.width + x] === 1;
    }
}
