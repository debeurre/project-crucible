import { Tool } from './Tool';
import { WorldState } from '../../core/WorldState';
import { CONFIG } from '../../core/Config';

export class ScentTool implements Tool {
    onDown(world: WorldState, x: number, y: number): void {
        this.paint(world, x, y);
    }

    onDrag(world: WorldState, x: number, y: number): void {
        this.paint(world, x, y);
    }

    onUp(_world: WorldState, _x: number, _y: number): void {}

    private paint(world: WorldState, x: number, y: number) {
        if (world.map.scents) {
            const gx = Math.floor(x / CONFIG.TILE_SIZE);
            const gy = Math.floor(y / CONFIG.TILE_SIZE);
            
            if (gx >= 0 && gx < world.map.width && gy >= 0 && gy < world.map.height) {
                const index = gy * world.map.width + gx;
                world.map.scents[index] = Math.min(1.0, world.map.scents[index] + 1.0);
            }
        }
    }
}
