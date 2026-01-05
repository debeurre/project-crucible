import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

export class NavigationSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        
        let nestX = 0, nestY = 0;
        for (const s of world.structures) {
            if (s.type === StructureType.NEST) {
                nestX = s.x;
                nestY = s.y;
                break;
            }
        }

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            const px = sprigs.x[i];
            const py = sprigs.y[i];
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];
            let vx = sprigs.vx[i];
            let vy = sprigs.vy[i];

            let steeringStrength = 10.0; // Default for Haulers

            // 0. Environmental Steering (Scent + Road Magnetism)
            if (sprigs.cargo[i] === 0) {
                const tileX = Math.floor(px / CONFIG.TILE_SIZE);
                const tileY = Math.floor(py / CONFIG.TILE_SIZE);
                
                // 1. Scent Gradient
                const leftScent = world.map.getScent(tileX - 1, tileY);
                const rightScent = world.map.getScent(tileX + 1, tileY);
                const upScent = world.map.getScent(tileX, tileY - 1);
                const downScent = world.map.getScent(tileX, tileY + 1);

                let scentGradX = rightScent - leftScent;
                let scentGradY = downScent - upScent;

                const dxNest = px - nestX;
                const dyNest = py - nestY;
                const distToNest = Math.sqrt(dxNest*dxNest + dyNest*dyNest);

                if (distToNest < 100) {
                    // Nest Repulsion: Invert Scents
                    scentGradX *= -1;
                    scentGradY *= -1;
                    steeringStrength = 5.0; // Boost steering to escape
                } else {
                    steeringStrength = 2.0;
                }

                // 2. Road Gradient
                let roadGradX = 0;
                let roadGradY = 0;
                if (world.map.roads) {
                    // Inline getRoad-like access for neighbors
                    // Helper to safely get road val
                    const getRoadVal = (gx: number, gy: number) => {
                        if (gx < 0 || gx >= world.map.width || gy < 0 || gy >= world.map.height) return 0;
                        return world.map.roads[gy * world.map.width + gx] || 0;
                    };

                    const leftRoad = getRoadVal(tileX - 1, tileY);
                    const rightRoad = getRoadVal(tileX + 1, tileY);
                    const upRoad = getRoadVal(tileX, tileY - 1);
                    const downRoad = getRoadVal(tileX, tileY + 1);

                    roadGradX = rightRoad - leftRoad;
                    roadGradY = downRoad - upRoad;
                }

                // 3. Combine and Apply
                // Normalize scent gradient if it's strong enough to be a vector
                const scentLen = Math.sqrt(scentGradX*scentGradX + scentGradY*scentGradY);
                if (scentLen > 0.01) {
                    // Normalized Scent Force
                    vx += (scentGradX / scentLen) * CONFIG.SCENT_STRENGTH * dt;
                    vy += (scentGradY / scentLen) * CONFIG.SCENT_STRENGTH * dt;
                }

                // Road Magnetism (Add directly, as it centers the unit)
                // If road gradient is positive X, it means road is stronger to the right. Move right.
                vx += roadGradX * CONFIG.ROAD_MAGNETISM * dt;
                vy += roadGradY * CONFIG.ROAD_MAGNETISM * dt;
            }

            // 1. Steering (Seek Target)
            const dx = tx - px;
            const dy = ty - py;
            const distToTarget = Math.sqrt(dx*dx + dy*dy);
            
            if (distToTarget > 0) {
                // Desired velocity is full speed towards target
                const desiredX = (dx / distToTarget) * CONFIG.MAX_SPEED;
                const desiredY = (dy / distToTarget) * CONFIG.MAX_SPEED;

                // Steering force: (desired - velocity) * strength
                const forceX = (desiredX - vx) * steeringStrength;
                const forceY = (desiredY - vy) * steeringStrength;

                vx += forceX * dt;
                vy += forceY * dt;
            }

            // 2. Hard Collision (The Slide)
            for (const s of world.structures) {
                if (s.type === StructureType.ROCK) {
                    const rdx = px - s.x;
                    const rdy = py - s.y;
                    const distSqr = rdx*rdx + rdy*rdy;
                    const minDist = s.radius + CONFIG.SPRIG_RADIUS;

                    if (distSqr < minDist * minDist) {
                        const dist = Math.sqrt(distSqr);
                        
                        // Normal Vector
                        let nx = 0, ny = 0;
                        if (dist > 0.0001) {
                            nx = rdx / dist;
                            ny = rdy / dist;
                        } else {
                            nx = 1; 
                            ny = 0;
                        }

                        // Project Position (Push Out)
                        const overlap = minDist - dist;
                        sprigs.x[i] += nx * overlap;
                        sprigs.y[i] += ny * overlap;

                        // Project Velocity (Slide)
                        // dotProduct = velocity . normal
                        const dotProduct = vx * nx + vy * ny;
                        
                        // If moving into wall (dot < 0), remove that component
                        if (dotProduct < 0) {
                            vx -= dotProduct * nx;
                            vy -= dotProduct * ny;
                        }
                    }
                }
            }

            // Update velocity back to array
            sprigs.vx[i] = vx;
            sprigs.vy[i] = vy;
        }
    }
}
