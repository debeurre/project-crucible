import { WorldState } from '../core/WorldState';
import { InputState } from '../core/InputState';
import { StructureType } from '../data/StructureData';

export class InteractionSystem {
    private wasDown: boolean = false;
    private nextId: number = 1000; // Start high to avoid collision with initial IDs

    public update(world: WorldState) {
        // Debounce: Only act on initial press (Click)
        // If we want drag-draw, we remove the !this.wasDown check.
        // Instructions: "Debounce: We need a simple 'Only one per click' check"
        if (InputState.isDown && !this.wasDown) {
            const x = InputState.x;
            const y = InputState.y;
            const radius = 30;

            // Check if obstructed
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
                console.log(`Spawned ROCK at ${x}, ${y}`);
            }
        }

        this.wasDown = InputState.isDown;
    }
}
