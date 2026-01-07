import { Tool } from './Tool';
import { WorldState } from '../WorldState';
import { StructureType } from '../../data/StructureData';

export class RockTool implements Tool {
    private nextId: number = 2000;

    onDown(world: WorldState, x: number, y: number): void {
        const radius = 30;
        let obstructed = false;
        
        for (const s of world.structures) {
            const dx = s.x - x;
            const dy = s.y - y;
            const r = s.radius + radius;
            if (dx*dx + dy*dy < r*r) {
                obstructed = true;
                break;
            }
        }

        if (!obstructed) {
            world.structures.push({
                id: this.nextId++,
                type: StructureType.ROCK,
                x: x,
                y: y,
                radius: radius
            });
        }
    }

    onDrag(_world: WorldState, _x: number, _y: number): void {}
    onUp(_world: WorldState, _x: number, _y: number): void {}
}
