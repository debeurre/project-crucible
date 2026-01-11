import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class SteeringSystem {
    public update(world: WorldState) {
        const sprigs = world.sprigs;
        const hash = world.spatialHash;
        
        // 1. Update Hash
        hash.update(sprigs);

        // 2. Calculate Forces
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;

            const x = sprigs.x[i];
            const y = sprigs.y[i];
            let ax = 0;
            let ay = 0;

            // SEEK (Target)
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];
            const dx = tx - x;
            const dy = ty - y;
            const distSq = dx * dx + dy * dy;
            
            // Only seek if distance > 1
            if (distSq > 1) {
                const dist = Math.sqrt(distSq);
                // Desire: Max Speed towards target
                const maxSpeed = sprigs.speed[i];
                const desireX = (dx / dist) * maxSpeed;
                const desireY = (dy / dist) * maxSpeed;
                
                // Steer: Desire - Current Velocity
                // Reynolds Steering = Desired - Velocity
                const steerX = desireX - sprigs.vx[i];
                const steerY = desireY - sprigs.vy[i];

                ax += steerX * CONFIG.STEER_SEEK_WEIGHT;
                ay += steerY * CONFIG.STEER_SEEK_WEIGHT;
            } else {
                // If at target, damp velocity
                ax += -sprigs.vx[i];
                ay += -sprigs.vy[i];
            }

            // NEIGHBORS (Separation / Cohesion)
            const neighbors = hash.query(x, y, 40); // 40px radius check
            
            let sepX = 0, sepY = 0, sepCount = 0;
            let cohX = 0, cohY = 0, cohCount = 0;

            for (const nIdx of neighbors) {
                if (nIdx === i) continue;
                
                const nx = sprigs.x[nIdx];
                const ny = sprigs.y[nIdx];
                const ndx = x - nx;
                const ndy = y - ny;
                const ndistSq = ndx * ndx + ndy * ndy;

                if (ndistSq > 0 && ndistSq < 40 * 40) {
                    const ndist = Math.sqrt(ndistSq);
                    
                    // Separation: Push away
                    // Weight inversely proportional to distance
                    const push = 1.0 / (ndist / 10); 
                    sepX += (ndx / ndist) * push;
                    sepY += (ndy / ndist) * push;
                    sepCount++;

                    // Cohesion: Accumulate position
                    cohX += nx;
                    cohY += ny;
                    cohCount++;
                }
            }

            if (sepCount > 0) {
                // Average
                sepX /= sepCount;
                sepY /= sepCount;
                // Normalize and Scale to max speed
                const len = Math.sqrt(sepX * sepX + sepY * sepY) || 1;
                sepX = (sepX / len) * sprigs.speed[i];
                sepY = (sepY / len) * sprigs.speed[i];
                
                // Steer away
                ax += (sepX - sprigs.vx[i]) * CONFIG.STEER_SEPARATION_WEIGHT;
                ay += (sepY - sprigs.vy[i]) * CONFIG.STEER_SEPARATION_WEIGHT;
            }

            if (cohCount > 0) {
                cohX /= cohCount;
                cohY /= cohCount;
                // Seek center
                const cdx = cohX - x;
                const cdy = cohY - y;
                const clen = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
                
                const desX = (cdx / clen) * sprigs.speed[i];
                const desY = (cdy / clen) * sprigs.speed[i];
                
                ax += (desX - sprigs.vx[i]) * CONFIG.STEER_COHESION_WEIGHT;
                ay += (desY - sprigs.vy[i]) * CONFIG.STEER_COHESION_WEIGHT;
            }

            sprigs.ax[i] = ax;
            sprigs.ay[i] = ay;
        }
    }
}
