import { Tool } from './Tool';
import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class EraserTool implements Tool {
    private radius: number = CONFIG.ERASER_RADIUS;

    public onDown(world: WorldState, x: number, y: number): void {
        this.erase(world, x, y);
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        this.erase(world, x, y);
    }

    public onUp(_world: WorldState, _x: number, _y: number): void {}

    private erase(world: WorldState, x: number, y: number) {
        const rSq = this.radius * this.radius;

        // Erase Sprigs
        const sprigs = world.sprigs;
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;
            
            const dx = sprigs.x[i] - x;
            const dy = sprigs.y[i] - y;
            if (dx * dx + dy * dy < rSq) {
                sprigs.active[i] = 0;
            }
        }

        // Erase Structures
        for (let i = world.structures.length - 1; i >= 0; i--) {
            const s = world.structures[i];
            const dx = s.x - x;
            const dy = s.y - y;
            if (dx * dx + dy * dy < rSq) {
                world.structureHash.remove(s);
                world.structures.splice(i, 1);
            }
        }
    }
}
