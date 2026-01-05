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
                    steeringStrength = 5.0; 
                } else {
                    steeringStrength = 2.0;
                }

                // 2. Road Gradient
                let roadGradX = 0;
                let roadGradY = 0;
                if (world.map.roads) {
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

                // 3. Apply Forces
                const scentLen = Math.sqrt(scentGradX*scentGradX + scentGradY*scentGradY);
                if (scentLen > 0.01) {
                    vx += (scentGradX / scentLen) * CONFIG.SCENT_STRENGTH * dt;
                    vy += (scentGradY / scentLen) * CONFIG.SCENT_STRENGTH * dt;
                }

                vx += roadGradX * CONFIG.ROAD_MAGNETISM * dt;
                vy += roadGradY * CONFIG.ROAD_MAGNETISM * dt;
            }

            // 1. Steering (Seek Target)
            const dx = tx - px;
            const dy = ty - py;
            const distToTarget = Math.sqrt(dx*dx + dy*dy);

            if (distToTarget > 0) {
                const desiredX = (dx / distToTarget) * CONFIG.MAX_SPEED;
                const desiredY = (dy / distToTarget) * CONFIG.MAX_SPEED;
                vx += (desiredX - vx) * steeringStrength * dt;
                vy += (desiredY - vy) * steeringStrength * dt;
            }

            // 1.5 Separation
            // Inline random sampling for speed/simplicity
            for (let k = 0; k < 10; k++) {
                const neighborIdx = Math.floor(Math.random() * CONFIG.MAX_SPRIGS);
                if (neighborIdx === i || sprigs.active[neighborIdx] === 0) continue;
                
                const sepDx = px - sprigs.x[neighborIdx];
                const sepDy = py - sprigs.y[neighborIdx];
                const sepDistSq = sepDx*sepDx + sepDy*sepDy;
                
                if (sepDistSq < 225) { // 15px
                    const sepDist = Math.sqrt(sepDistSq);
                    if (sepDist > 0.001) {
                        const force = 200.0 * dt;
                        vx += (sepDx / sepDist) * force;
                        vy += (sepDy / sepDist) * force;
                    }
                }
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
                        let nx = 0, ny = 0;
                        if (dist > 0.001) {
                            nx = rdx / dist;
                            ny = rdy / dist;
                        } else {
                            nx = 1; ny = 0;
                        }

                        const overlap = minDist - dist;
                        sprigs.x[i] += nx * overlap;
                        sprigs.y[i] += ny * overlap;

                        const dotProduct = vx * nx + vy * ny;
                        if (dotProduct < 0) {
                            vx -= dotProduct * nx;
                            vy -= dotProduct * ny;
                        }
                    }
                }
            }

            sprigs.vx[i] = vx;
            sprigs.vy[i] = vy;
        }
    }
}