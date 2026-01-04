import { WorldState } from '../core/WorldState';

export class EcologySystem {
    public update(world: WorldState, dt: number) {
        // Runtime patch for hot-reload state mismatch
        if (!world.map.scents) {
            world.map.scents = new Float32Array(world.map.width * world.map.height);
        }

        const scents = world.map.scents;
        const len = scents.length;
        const decayAmount = 0.1 * dt; // Linear decay over 10 seconds (1.0 / 10.0)

        for (let i = 0; i < len; i++) {
            if (scents[i] > 0) {
                scents[i] -= decayAmount;
                if (scents[i] < 0) {
                    scents[i] = 0;
                }
            }
        }
    }
}
