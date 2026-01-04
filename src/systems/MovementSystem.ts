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

            // Drop Scent (Haulers leave trails)
            if (sprigs.cargo[i] === 1 && world.map.scents) {
                const gx = Math.floor(sprigs.x[i] / CONFIG.TILE_SIZE);
                const gy = Math.floor(sprigs.y[i] / CONFIG.TILE_SIZE);
                if (gx >= 0 && gx < world.map.width && gy >= 0 && gy < world.map.height) {
                    const idx = gy * world.map.width + gx;
                    world.map.scents[idx] = Math.min(1.0, world.map.scents[idx] + 0.5 * dt);
                }
            }

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