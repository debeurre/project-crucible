import { Tool } from './Tool';
import { WorldState } from '../core/WorldState';

export class EraserTool implements Tool {
    public onDown(world: WorldState, x: number, y: number): void {
        this.erase(world, x, y);
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        this.erase(world, x, y);
    }

    public onUp(_world: WorldState, _x: number, _y: number): void {}

    private erase(world: WorldState, x: number, y: number) {
        // Erase Sprigs
        // We use a small radius for eraser
        const sprigId = world.sprigs.getSprigAt(x, y, 20);
        if (sprigId !== -1) {
            world.sprigs.active[sprigId] = 0;
        }

        // Erase Structures
        for (let i = world.structures.length - 1; i >= 0; i--) {
            const s = world.structures[i];
            const dx = s.x - x;
            const dy = s.y - y;
            if (dx * dx + dy * dy < 20 * 20) {
                world.structures.splice(i, 1);
            }
        }
    }
}
