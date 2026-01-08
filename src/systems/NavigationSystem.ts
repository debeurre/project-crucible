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
            const vx = sprigs.vx[i];
            const vy = sprigs.vy[i];
            
            let forceX = 0;
            let forceY = 0;

            // Helper: Safe Normalize and Add Force
            const safeAdd = (x: number, y: number, scale: number) => {
                const len = Math.sqrt(x*x + y*y);
                if (len > 0.001) {
                    forceX += (x / len) * scale;
                    forceY += (y / len) * scale;
                }
            };

            // 1. Separation (CRITICAL)
            for (let k = 0; k < 5; k++) { 
                const neighborIdx = Math.floor(Math.random() * CONFIG.MAX_SPRIGS);
                if (neighborIdx === i || sprigs.active[neighborIdx] === 0) continue;
                
                const sepDx = px - sprigs.x[neighborIdx];
                const sepDy = py - sprigs.y[neighborIdx];
                const sepDistSq = sepDx*sepDx + sepDy*sepDy;
                
                if (sepDistSq < 225) { // 15px radius
                    safeAdd(sepDx, sepDy, 500.0);
                }
            }

            // 2. Avoidance (Rocks Only)
            const speed = Math.sqrt(vx*vx + vy*vy);
            if (speed > 1.0) {
                const lookAhead = CONFIG.WHISKER_LENGTH;
                const rayDirX = vx / speed;
                const rayDirY = vy / speed;
                
                let mostThreatening = null;
                let minDist = Infinity;

                for (const s of world.structures) {
                    if (s.type === StructureType.ROCK) {
                        const toSphereX = s.x - px;
                        const toSphereY = s.y - py;
                        const t = (toSphereX * rayDirX + toSphereY * rayDirY);
                        
                        let closeX = px + rayDirX * t;
                        let closeY = py + rayDirY * t;
                        
                        if (t <= 0) { closeX = px; closeY = py; }
                        else if (t >= lookAhead) { closeX = px + rayDirX * lookAhead; closeY = py + rayDirY * lookAhead; }
                        
                        const distX = s.x - closeX;
                        const distY = s.y - closeY;
                        const distSq = distX*distX + distY*distY;
                        const r = s.radius + CONFIG.SPRIG_RADIUS;
                        
                        if (distSq < r*r && distSq < minDist) {
                            minDist = distSq;
                            mostThreatening = s;
                        }
                    }
                }

                if (mostThreatening) {
                    const toSphereX = mostThreatening.x - px;
                    const toSphereY = mostThreatening.y - py;
                    const t = (toSphereX * rayDirX + toSphereY * rayDirY);
                    let closeX = px + rayDirX * t;
                    let closeY = py + rayDirY * t;
                    if (t <= 0) { closeX = px; closeY = py; }
                    else if (t >= lookAhead) { closeX = px + rayDirX * lookAhead; closeY = py + rayDirY * lookAhead; }

                    const normalX = closeX - mostThreatening.x;
                    const normalY = closeY - mostThreatening.y; 
                    
                    safeAdd(normalX, normalY, CONFIG.AVOID_FORCE);
                    
                    let tanX = -normalY;
                    let tanY = normalX;
                    if (vx * tanX + vy * tanY < 0) {
                        tanX = -tanX;
                        tanY = -tanY;
                    }
                    safeAdd(tanX, tanY, CONFIG.WALL_FOLLOW_FORCE);
                }
            }

            // 3. Flow (Empty Sprigs)
            let hasFlow = false;
            if (sprigs.cargo[i] === 0) {
                const flow = world.flowField.getVector(px, py);
                if (Math.abs(flow.x) > 0.01 || Math.abs(flow.y) > 0.01) {
                    hasFlow = true;
                    forceX += flow.x * CONFIG.MAX_SPEED * CONFIG.FLOW_WEIGHT;
                    forceY += flow.y * CONFIG.MAX_SPEED * CONFIG.FLOW_WEIGHT;
                    
                    // Reduced Wander (Visual Noise)
                    forceX += (Math.random() - 0.5) * 100 * (CONFIG.WANDER_WEIGHT * 0.2);
                    forceY += (Math.random() - 0.5) * 100 * (CONFIG.WANDER_WEIGHT * 0.2);
                }
            }

            // 4. Wander (Empty + No Flow) - Leashed
            if (sprigs.cargo[i] === 0 && !hasFlow) {
                sprigs.wanderTimer[i] -= dt * 1000;
                
                if (sprigs.wanderTimer[i] <= 0) {
                    sprigs.wanderTimer[i] = CONFIG.WANDER_INTERVAL;
                    
                    const dx = px - nestX;
                    const dy = py - nestY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const angleToNest = Math.atan2(-dy, -dx);
                    
                    let targetAngle = 0;
                    if (dist > CONFIG.LEASH_RADIUS) {
                        // Too far: Go towards nest (+/- 45 deg)
                        targetAngle = angleToNest + (Math.random() - 0.5) * 1.5;
                    } else {
                        // Close: Go away from nest (+/- 135 deg)
                        targetAngle = angleToNest + Math.PI + (Math.random() - 0.5) * 4.5;
                    }
                    
                    sprigs.wanderVx[i] = Math.cos(targetAngle) * CONFIG.WANDER_SPEED;
                    sprigs.wanderVy[i] = Math.sin(targetAngle) * CONFIG.WANDER_SPEED;
                }
                
                forceX += sprigs.wanderVx[i];
                forceY += sprigs.wanderVy[i];
            }

            // 5. Seek (Haulers Only)
            if (sprigs.cargo[i] === 1) {
                const tx = sprigs.targetX[i];
                const ty = sprigs.targetY[i];
                const dx = tx - px;
                const dy = ty - py;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > CONFIG.INTERACTION_BUFFER) {
                    safeAdd(dx, dy, 500.0);
                } else {
                    forceX -= vx * 5.0;
                    forceY -= vy * 5.0;
                }
            }

            sprigs.ax[i] = forceX;
            sprigs.ay[i] = forceY;
        }
    }
}
