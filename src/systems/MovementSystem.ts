import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class MovementSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            let vx = sprigs.vx[i];
            let vy = sprigs.vy[i];
            const ax = sprigs.ax[i];
            const ay = sprigs.ay[i];

            // 1. Integrate Acceleration
            vx += ax * dt;
            vy += ay * dt;

            // 2. Friction
            vx *= 0.95;
            vy *= 0.95;

            // 3. Integrate Position
            sprigs.x[i] += vx * dt;
            sprigs.y[i] += vy * dt;

            // 4. Speed Limit (with Road Multiplier)
            const speedSqr = vx*vx + vy*vy;
            
            // Check Road
            let roadVal = 0;
            if (world.map.roads) {
                const gx = Math.floor(sprigs.x[i] / CONFIG.TILE_SIZE);
                const gy = Math.floor(sprigs.y[i] / CONFIG.TILE_SIZE);
                if (gx >= 0 && gx < world.map.width && gy >= 0 && gy < world.map.height) {
                    const idx = gy * world.map.width + gx;
                    roadVal = world.map.roads[idx] || 0;
                }
            }
            
            const currentMaxSpeed = CONFIG.MAX_SPEED * (1.0 + roadVal * 0.5);
            if (speedSqr > currentMaxSpeed * currentMaxSpeed) {
                const scale = currentMaxSpeed / Math.sqrt(speedSqr);
                vx *= scale;
                vy *= scale;
            }

            // 5. Heavy Hauler Step (Lunge and Recover)
            if (sprigs.cargo[i] === 1) {
                const now = performance.now();
                const stepProgress = ((now + sprigs.stepOffset[i]) % CONFIG.HAULER_STEP_DURATION) / CONFIG.HAULER_STEP_DURATION;
                
                // Ease-Out Burst: 1.0 -> 0.0
                const speedFactor = 1.0 - Math.pow(stepProgress, CONFIG.HAULER_STEEP);
                
                // Apply Drag + Burst Logic
                // Note: This is a heavy per-frame multiplication, creating a strong stop-go rhythm.
                vx *= CONFIG.HAULER_DRAG * speedFactor;
                vy *= CONFIG.HAULER_DRAG * speedFactor;
            }

            // Store State
            sprigs.vx[i] = vx;
            sprigs.vy[i] = vy;
            sprigs.ax[i] = 0;
            sprigs.ay[i] = 0;
        }
    }
}