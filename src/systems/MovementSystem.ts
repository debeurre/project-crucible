import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class MovementSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            // Simple Physics
            sprigs.x[i] += sprigs.vx[i] * dt;
            sprigs.y[i] += sprigs.vy[i] * dt;
        }
    }
}
