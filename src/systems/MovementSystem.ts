import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class MovementSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            // Brownian motion (jitter)
            sprigs.vx[i] += (Math.random() - 0.5) * 0.5;
            sprigs.vy[i] += (Math.random() - 0.5) * 0.5;

            // Integrate
            sprigs.x[i] += sprigs.vx[i] * dt;
            sprigs.y[i] += sprigs.vy[i] * dt;

            // Friction
            sprigs.vx[i] *= 0.9;
            sprigs.vy[i] *= 0.9;
        }
    }
}
