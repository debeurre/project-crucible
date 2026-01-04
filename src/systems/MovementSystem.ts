import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class MovementSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        const maxSpeedSq = CONFIG.MAX_SPEED * CONFIG.MAX_SPEED;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            let vx = sprigs.vx[i];
            let vy = sprigs.vy[i];

            // Integrate
            sprigs.x[i] += vx * dt;
            sprigs.y[i] += vy * dt;

            // Speed Limit
            const speedSqr = vx*vx + vy*vy;
            if (speedSqr > maxSpeedSq) {
                const scale = CONFIG.MAX_SPEED / Math.sqrt(speedSqr);
                sprigs.vx[i] *= scale;
                sprigs.vy[i] *= scale;
            }
        }
    }
}