import { Tool } from './Tool';
import { WorldState } from '../../core/WorldState';

export class EraserTool implements Tool {
    onDown(world: WorldState, x: number, y: number): void {
        this.erase(world, x, y);
    }

    onDrag(world: WorldState, x: number, y: number): void {
        this.erase(world, x, y);
    }

    onUp(_world: WorldState, _x: number, _y: number): void {}

    private erase(world: WorldState, x: number, y: number) {
        const radius = 20;
        for (let i = world.structures.length - 1; i >= 0; i--) {
            const s = world.structures[i];
            const dx = s.x - x;
            const dy = s.y - y;
            if (dx*dx + dy*dy < (s.radius + radius)**2) {
                world.structures.splice(i, 1);
            }
        }
    }
}
