import { WorldState } from '../core/WorldState';

export class EcologySystem {
    public update(world: WorldState, _dt: number) {
        // Runtime patch for hot-reload state mismatch
        if (!world.map.scents) {
            world.map.scents = new Float32Array(world.map.width * world.map.height);
        }

        const scents = world.map.scents;
        const len = scents.length;

        // Simple decay for now. 
        // Note: dt is in seconds, but decay is per frame here if we just multiply.
        // To be time-independent: Math.pow(decayRate, dt).
        // If we want 0.99 per frame (at 60fps), that's ~0.5 per second?
        // Let's use a fixed decay factor per update for simplicity in this phase, 
        // or properly scale by dt.
        // Instruction: "Decay: scent *= 0.99".
        // I will assume per-frame for now as per instruction, but dt-scaled is better.
        // Let's use 0.99 for now to match instruction directly.
        
        for (let i = 0; i < len; i++) {
            if (scents[i] > 0) {
                scents[i] *= 0.99;
                if (scents[i] < 0.01) {
                    scents[i] = 0;
                }
            }
        }
    }
}
