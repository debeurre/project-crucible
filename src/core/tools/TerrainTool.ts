import { Tool } from './Tool';
import { WorldState } from '../../core/WorldState';
import { Terrain } from '../../data/MapData';
import { CONFIG } from '../Config';

export class TerrainTool implements Tool {
    private brush: number = Terrain.GRASS;
    private radius: number = 50;

    public onDown(world: WorldState, x: number, y: number): void {
        this.paint(world, x, y);
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        this.paint(world, x, y);
    }

    public onUp(_world: WorldState, _x: number, _y: number): void {}

    private paint(world: WorldState, x: number, y: number) {
        const gridRadius = Math.ceil(this.radius / CONFIG.GRID_SIZE);
        const centerCol = world.grid.getCol(x);
        const centerRow = world.grid.getRow(y);
        const rSq = this.radius * this.radius;

        for (let row = centerRow - gridRadius; row <= centerRow + gridRadius; row++) {
            for (let col = centerCol - gridRadius; col <= centerCol + gridRadius; col++) {
                if (world.grid.isValid(col, row)) {
                    // Check distance from brush center to tile center
                    const tileX = col * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
                    const tileY = row * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
                    const dx = tileX - x;
                    const dy = tileY - y;

                    if (dx * dx + dy * dy < rSq) {
                        const idx = world.map.getIndex(col, row);
                        world.map.terrain[idx] = this.brush;
                        world.terrainDirty = true;
                    }
                }
            }
        }
    }

    public cycleOption(): void {
        this.brush++;
        // Cycle: GRASS(1) -> MUD(2) -> WATER(3) -> VOID(0) -> GRASS(1)
        if (this.brush > 3) this.brush = 0;
    }

    public setOption(value: number): void {
        this.brush = value;
    }

    public getOptionName(): string {
        switch (this.brush) {
            case Terrain.VOID: return 'VOID';
            case Terrain.GRASS: return 'GRASS';
            case Terrain.MUD: return 'MUD';
            case Terrain.WATER: return 'WATER';
            default: return 'UNKNOWN';
        }
    }
}
