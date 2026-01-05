import { WorldState } from '../core/WorldState';

export class EcologySystem {
    public update(world: WorldState, dt: number) {
        // Runtime patch for hot-reload state mismatch
        if (!world.map.scents) {
            world.map.scents = new Float32Array(world.map.width * world.map.height);
        }
        if (!world.map.roads) {
            world.map.roads = new Float32Array(world.map.width * world.map.height);
        }

        const scents = world.map.scents;
        const roads = world.map.roads;
        const len = scents.length;
        const scentDecay = 0.1 * dt; // Linear decay over 10 seconds (1.0 / 10.0)
        const roadBuild = 0.5 * dt;
        const roadDecay = 0.05 * dt;

        for (let i = 0; i < len; i++) {
            // Scent Logic
            if (scents[i] > 0) {
                scents[i] -= scentDecay;
                if (scents[i] < 0) {
                    scents[i] = 0;
                }
            }

            // Road Logic
            if (scents[i] > 0.5) {
                roads[i] = Math.min(1.0, roads[i] + roadBuild);
            } else {
                roads[i] = Math.max(0.0, roads[i] - roadDecay);
            }
        }
    }
}
