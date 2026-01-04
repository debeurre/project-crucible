import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

export class NavigationSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        // Tuning
        const steeringStrength = 10.0; 

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            const px = sprigs.x[i];
            const py = sprigs.y[i];
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];
            let vx = sprigs.vx[i];
            let vy = sprigs.vy[i];

            // 0. Scent Following (The Nose)
            if (sprigs.cargo[i] === 0) {
                const tileX = Math.floor(px / CONFIG.TILE_SIZE);
                const tileY = Math.floor(py / CONFIG.TILE_SIZE);
                
                const left = world.map.getScent(tileX - 1, tileY);
                const right = world.map.getScent(tileX + 1, tileY);
                const up = world.map.getScent(tileX, tileY - 1);
                const down = world.map.getScent(tileX, tileY + 1);

                const gradX = right - left;
                const gradY = down - up;

                const gradLen = Math.sqrt(gradX * gradX + gradY * gradY);
                if (gradLen > 0.01) {
                    // Normalize and apply strong force
                    vx += (gradX / gradLen) * CONFIG.SCENT_STRENGTH * dt;
                    vy += (gradY / gradLen) * CONFIG.SCENT_STRENGTH * dt;
                }
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
