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
        
        // Decay factor matching 0.995 per frame at 60fps
        const scentDecayFactor = Math.pow(0.995, dt * 60);
        
        const roadThreshold = 0.1;
        const roadBuild = 1.0 * dt;
        const roadDecay = 0.1 * dt;

        for (let i = 0; i < len; i++) {
            // Scent Logic
            if (scents[i] > 0) {
                scents[i] *= scentDecayFactor;
                if (scents[i] < 0.01) {
                    scents[i] = 0;
                }
            }

            // Road Logic
            if (scents[i] > roadThreshold) {
                roads[i] = Math.min(1.0, roads[i] + roadBuild);
            } else {
                roads[i] = Math.max(0.0, roads[i] - roadDecay);
            }
        }
    }
}
