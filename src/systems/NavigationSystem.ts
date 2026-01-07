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

            // Reset acceleration
            let ax = 0;
            let ay = 0;
            
            const px = sprigs.x[i];
            const py = sprigs.y[i];
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];

            // 1. Scent Force
            let scentAx = 0;
            let scentAy = 0;
            if (sprigs.cargo[i] === 0) { // Only Haulers seeking food follow scent/rail usually? Or all?
                // Assuming cargo=0 follows scent/rail to source. Cargo=1 returns to nest.
                // The prompt didn't specify cargo logic change, so I'll keep existing Scent context.
                const tileX = Math.floor(px / CONFIG.TILE_SIZE);
                const tileY = Math.floor(py / CONFIG.TILE_SIZE);
                
                const leftScent = world.map.getScent(tileX - 1, tileY);
                const rightScent = world.map.getScent(tileX + 1, tileY);
                const upScent = world.map.getScent(tileX, tileY - 1);
                const downScent = world.map.getScent(tileX, tileY + 1);

                let scentGradX = rightScent - leftScent;
                let scentGradY = downScent - upScent;
                
                // Nest Repulsion
                const dxNest = px - nestX;
                const dyNest = py - nestY;
                if (dxNest*dxNest + dyNest*dyNest < 10000) {
                    scentGradX *= -1;
                    scentGradY *= -1;
                }

                const scentLen = Math.sqrt(scentGradX*scentGradX + scentGradY*scentGradY);
                if (scentLen > 0.01) {
                    scentAx = (scentGradX / scentLen) * (CONFIG.SCENT_STRENGTH * CONFIG.SCENT_WEIGHT);
                    scentAy = (scentGradY / scentLen) * (CONFIG.SCENT_STRENGTH * CONFIG.SCENT_WEIGHT);
                }
            }

            // 2. Rail Force (The Blender)
            let railAx = 0;
            let railAy = 0;
            let railActive = false;

            if (world.rail && world.rail.length > 1) {
                // Find closest point
                let minDistSq = Infinity;
                let closestIdx = -1;
                
                for (let j = 0; j < world.rail.length; j += 2) {
                    const r = world.rail[j];
                    const rdx = r.x - px;
                    const rdy = r.y - py;
                    const dSq = rdx*rdx + rdy*rdy;
                    if (dSq < minDistSq) {
                        minDistSq = dSq;
                        closestIdx = j;
                    }
                }

                if (minDistSq < 1600) { // 40px range
                    railActive = true;
                    // Attraction
                    const r = world.rail[closestIdx];
                    const attrX = (r.x - px) * CONFIG.RAIL_MAGNET_STRENGTH * 2; 
                    const attrY = (r.y - py) * CONFIG.RAIL_MAGNET_STRENGTH * 2;

                    // Tangent (Push)
                    let nextIdx = closestIdx;
                    if (sprigs.cargo[i] === 0) {
                         nextIdx = Math.min(closestIdx + 5, world.rail.length - 1);
                    } else {
                         nextIdx = Math.max(closestIdx - 5, 0);
                    }
                    
                    let tanX = 0, tanY = 0;
                    if (nextIdx !== closestIdx) {
                        const nextR = world.rail[nextIdx];
                        const tdx = nextR.x - px;
                        const tdy = nextR.y - py;
                        const tLen = Math.sqrt(tdx*tdx + tdy*tdy);
                        if (tLen > 0.01) {
                            const speed = 400.0;
                            // Rail Push: If aligned, boost speed? 
                            // For now, tangent force IS the push.
                            tanX = (tdx / tLen) * speed;
                            tanY = (tdy / tLen) * speed;
                        }
                    }

                    railAx = attrX + tanX;
                    railAy = attrY + tanY;
                }
            }

            // Blend
            if (railActive) {
                ax += railAx * CONFIG.RAIL_WEIGHT + scentAx * CONFIG.SCENT_WEIGHT;
                ay += railAy * CONFIG.RAIL_WEIGHT + scentAy * CONFIG.SCENT_WEIGHT;
            } else {
                ax += scentAx;
                ay += scentAy;
                
                // Add Seek Target if not on rail (Goal Steering)
                const dx = tx - px;
                const dy = ty - py;
                const distToTarget = Math.sqrt(dx*dx + dy*dy);
                if (distToTarget > CONFIG.INTERACTION_BUFFER) {
                    ax += (dx / distToTarget) * 100.0;
                    ay += (dy / distToTarget) * 100.0;
                }
            }

            // 1.5 Separation
            for (let k = 0; k < 5; k++) { // Reduced samples for perf
                const neighborIdx = Math.floor(Math.random() * CONFIG.MAX_SPRIGS);
                if (neighborIdx === i || sprigs.active[neighborIdx] === 0) continue;
                
                const sepDx = px - sprigs.x[neighborIdx];
                const sepDy = py - sprigs.y[neighborIdx];
                const sepDistSq = sepDx*sepDx + sepDy*sepDy;
                
                if (sepDistSq < 225) { // 15px
                    const sepDist = Math.sqrt(sepDistSq);
                    if (sepDist > 0.001) {
                        const force = 500.0;
                        ax += (sepDx / sepDist) * force;
                        ay += (sepDy / sepDist) * force;
                    }
                }
            }

            // Hard Collision (Direct Position/Velocity Correction)
            // This modifies Position directly, which is distinct from Acceleration.
            let vx = sprigs.vx[i];
            let vy = sprigs.vy[i];
            
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
            sprigs.ax[i] = ax;
            sprigs.ay[i] = ay;
        }
    }
}