import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class MovementSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            // Rail Magnetism
            if (world.rail.length > 1) {
                const px = sprigs.x[i];
                const py = sprigs.y[i];
                
                // Find closest point (Simple brute force)
                // TODO: Optimize with spatial hash or index tracking
                let minDistSq = Infinity;
                let closestIdx = -1;
                
                for (let j = 0; j < world.rail.length; j += 2) { // Skip every other point for speed
                    const r = world.rail[j];
                    const dx = r.x - px;
                    const dy = r.y - py;
                    const dSq = dx*dx + dy*dy;
                    if (dSq < minDistSq) {
                        minDistSq = dSq;
                        closestIdx = j;
                    }
                }

                // Lock-on Range: 30px
                if (minDistSq < 900) {
                    // Dampen existing velocity (Wander/Scent) to favor Rail
                    sprigs.vx[i] *= 0.95;
                    sprigs.vy[i] *= 0.95;

                    const r = world.rail[closestIdx];
                    
                    // 1. Attraction (Pull towards line)
                    const dx = r.x - px;
                    const dy = r.y - py;
                    sprigs.vx[i] += dx * CONFIG.RAIL_MAGNET_STRENGTH * dt;
                    sprigs.vy[i] += dy * CONFIG.RAIL_MAGNET_STRENGTH * dt;

                    // 2. Flow (Move along line)
                    let targetIdx = closestIdx;
                    if (sprigs.cargo[i] === 0) {
                        // Going to Cookie (End of array)
                        targetIdx = Math.min(closestIdx + 10, world.rail.length - 1);
                    } else {
                        // Going to Nest (Start of array)
                        targetIdx = Math.max(closestIdx - 10, 0);
                    }
                    
                    if (targetIdx !== closestIdx) {
                        const target = world.rail[targetIdx];
                        const tdx = target.x - px; // vector from sprite to target ahead
                        const tdy = target.y - py;
                        const dist = Math.sqrt(tdx*tdx + tdy*tdy);
                        if (dist > 0.001) {
                            const speed = 300.0; // Acceleration
                            sprigs.vx[i] += (tdx / dist) * speed * dt;
                            sprigs.vy[i] += (tdy / dist) * speed * dt;
                        }
                    }
                }
            }

            let vx = sprigs.vx[i];
            let vy = sprigs.vy[i];

            // Integrate
            sprigs.x[i] += vx * dt;
            sprigs.y[i] += vy * dt;

            const speedSqr = vx*vx + vy*vy;

            // Drop Scent (Haulers leave trails ONLY if moving fast enough)
            if (sprigs.cargo[i] === 1 && speedSqr > 400 && world.map.scents) {
                const gx = Math.floor(sprigs.x[i] / CONFIG.TILE_SIZE);
                const gy = Math.floor(sprigs.y[i] / CONFIG.TILE_SIZE);
                if (gx >= 0 && gx < world.map.width && gy >= 0 && gy < world.map.height) {
                    const idx = gy * world.map.width + gx;
                    world.map.scents[idx] = Math.min(1.0, world.map.scents[idx] + 0.5 * dt);
                }
            }

            // Speed Limit
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
            const maxSpeedSq = currentMaxSpeed * currentMaxSpeed;

            if (speedSqr > maxSpeedSq) {
                const scale = currentMaxSpeed / Math.sqrt(speedSqr);
                sprigs.vx[i] *= scale;
                sprigs.vy[i] *= scale;
            }
        }
    }
}
