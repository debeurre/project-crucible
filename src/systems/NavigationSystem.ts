import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

export class NavigationSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            const px = sprigs.x[i];
            const py = sprigs.y[i];
            const vx = sprigs.vx[i];
            const vy = sprigs.vy[i];
            
            let ax = 0;
            let ay = 0;

            // Step 1: Seek Target
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];
            const dx = tx - px;
            const dy = ty - py;
            const distToTarget = Math.sqrt(dx*dx + dy*dy);

            if (distToTarget > CONFIG.INTERACTION_BUFFER) {
                // Seek force (Proportional to distance logic or Max Speed logic)
                // Reynolds Seek: Desired - Velocity
                const desiredSpeed = CONFIG.MAX_SPEED;
                const desiredVx = (dx / distToTarget) * desiredSpeed;
                const desiredVy = (dy / distToTarget) * desiredSpeed;
                
                const steerX = desiredVx - vx;
                const steerY = desiredVy - vy;
                
                // Steering strength
                ax += steerX * 5.0; 
                ay += steerY * 5.0;
            } else {
                // Arrive / Stop
                ax -= vx * 5.0;
                ay -= vy * 5.0;
            }

            // Step 2: Whisker Raycast (Avoidance)
            const speed = Math.sqrt(vx*vx + vy*vy);
            if (speed > 1.0) {
                const lookAhead = CONFIG.WHISKER_LENGTH;
                const rayDirX = vx / speed;
                const rayDirY = vy / speed;
                const rayEndX = px + rayDirX * lookAhead;
                const rayEndY = py + rayDirY * lookAhead;

                let mostThreatening = null;
                let minDist = Infinity;

                // Check Rocks
                for (const s of world.structures) {
                    if (s.type === StructureType.ROCK) {
                        // Vector from RayStart to SphereCenter
                        const toSphereX = s.x - px;
                        const toSphereY = s.y - py;
                        
                        // Project SphereCenter onto Ray
                        const t = (toSphereX * rayDirX + toSphereY * rayDirY);
                        
                        // Closest point on ray
                        let closeX = px + rayDirX * t;
                        let closeY = py + rayDirY * t;
                        
                        // Clamp
                        if (t <= 0) { closeX = px; closeY = py; }
                        else if (t >= lookAhead) { closeX = rayEndX; closeY = rayEndY; }
                        
                        const distX = s.x - closeX;
                        const distY = s.y - closeY;
                        const distSq = distX*distX + distY*distY;
                        
                        const r = s.radius + CONFIG.SPRIG_RADIUS;
                        
                        if (distSq < r*r) {
                            if (distSq < minDist) {
                                minDist = distSq;
                                mostThreatening = s;
                            }
                        }
                    }
                }

                if (mostThreatening) {
                    // Re-calculate closest point for most threatening
                    const toSphereX = mostThreatening.x - px;
                    const toSphereY = mostThreatening.y - py;
                    const t = (toSphereX * rayDirX + toSphereY * rayDirY);
                    let closeX = px + rayDirX * t;
                    let closeY = py + rayDirY * t;
                    if (t <= 0) { closeX = px; closeY = py; }
                    else if (t >= lookAhead) { closeX = rayEndX; closeY = rayEndY; }

                    // Normal: From Rock to ClosestPoint (pushes away)
                    let normalX = closeX - mostThreatening.x;
                    let normalY = closeY - mostThreatening.y;
                    const normalLen = Math.sqrt(normalX*normalX + normalY*normalY);
                    
                    if (normalLen > 0.001) {
                        normalX /= normalLen;
                        normalY /= normalLen;
                        
                        // Apply AVOID_FORCE along Normal
                        ax += normalX * CONFIG.AVOID_FORCE;
                        ay += normalY * CONFIG.AVOID_FORCE;
                        
                        // Apply WALL_FOLLOW_FORCE along Tangent
                        let tanX = -normalY;
                        let tanY = normalX;
                        
                        // Align tangent with velocity
                        if (vx * tanX + vy * tanY < 0) {
                            tanX = -tanX;
                            tanY = -tanY;
                        }
                        
                        ax += tanX * CONFIG.WALL_FOLLOW_FORCE;
                        ay += tanY * CONFIG.WALL_FOLLOW_FORCE;
                    }
                }
            }

            // Hard Collision (Safety)
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
                        
                        const dot = sprigs.vx[i] * nx + sprigs.vy[i] * ny;
                        if (dot < 0) {
                            sprigs.vx[i] -= dot * nx;
                            sprigs.vy[i] -= dot * ny;
                        }
                    }
                }
            }

            sprigs.ax[i] = ax;
            sprigs.ay[i] = ay;
        }
    }
}
