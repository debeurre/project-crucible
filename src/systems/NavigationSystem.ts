import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

export class NavigationSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        
        // Cache Nest position for Leashed Wander
        const nest = world.structures.find(s => s.type === StructureType.NEST);
        const nestX = nest ? nest.x : 0;
        const nestY = nest ? nest.y : 0;

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

            // 1. Separation
            for (let k = 0; k < 5; k++) { 
                const neighborIdx = Math.floor(Math.random() * CONFIG.MAX_SPRIGS);
                if (neighborIdx === i || sprigs.active[neighborIdx] === 0) continue;
                
                const sepDx = px - sprigs.x[neighborIdx];
                const sepDy = py - sprigs.y[neighborIdx];
                const sepDistSq = sepDx*sepDx + sepDy*sepDy;
                
                if (sepDistSq < 225) { 
                    safeAdd(sepDx, sepDy, 500.0);
                }
            }

            // 2. Avoidance (Slide Logic)
            const speed = Math.sqrt(vx*vx + vy*vy);
            if (speed > 1.0) {
                const lookAhead = CONFIG.WHISKER_LENGTH;
                const rayDirX = vx / speed;
                const rayDirY = vy / speed;
                const rayEndX = px + rayDirX * lookAhead;
                const rayEndY = py + rayDirY * lookAhead;
                
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
                    // Re-calculate
                    const toSphereX = mostThreatening.x - px;
                    const toSphereY = mostThreatening.y - py;
                    const t = (toSphereX * rayDirX + toSphereY * rayDirY);
                    let closeX = px + rayDirX * t;
                    let closeY = py + rayDirY * t;
                    if (t <= 0) { closeX = px; closeY = py; }
                    else if (t >= lookAhead) { closeX = px + rayDirX * lookAhead; closeY = py + rayDirY * lookAhead; }

                    let normalX = closeX - mostThreatening.x;
                    let normalY = closeY - mostThreatening.y; 
                    const len = Math.sqrt(normalX*normalX + normalY*normalY);
                    
                    if (len > 0.001) {
                        normalX /= len;
                        normalY /= len;
                        
                        const dot = vx * normalX + vy * normalY;
                        const slideVx = vx - (dot * normalX);
                        const slideVy = vy - (dot * normalY);
                        
                        const pushVx = normalX * 10;
                        const pushVy = normalY * 10;
                        
                        sprigs.vx[i] = slideVx + pushVx;
                        sprigs.vy[i] = slideVy + pushVy;
                    }
                }
            }

            // 3. Flow (Empty Sprigs)
            let hasFlow = false;
            if (sprigs.cargo[i] === 0) {
                const flow = world.flowField.getVector(px, py);
                
                // Debug Log (Throttled)
                if (i === 0 && Math.random() < 0.01) {
                    const len = Math.sqrt(flow.x*flow.x + flow.y*flow.y);
                    console.log(`Sprig 0 Sensor: Flow Strength = ${len.toFixed(3)} at [${Math.floor(px)}, ${Math.floor(py)}]`);
                }

                if (Math.abs(flow.x) > 0.01 || Math.abs(flow.y) > 0.01) {
                    hasFlow = true;
                    forceX += flow.x * CONFIG.MAX_SPEED * CONFIG.FLOW_WEIGHT;
                    forceY += flow.y * CONFIG.MAX_SPEED * CONFIG.FLOW_WEIGHT;
                }
            }

            // 4. Wander (Empty + No Flow)
            if (sprigs.cargo[i] === 0 && !hasFlow) {
                sprigs.wanderTimer[i] -= dt * 1000;
                if (sprigs.wanderTimer[i] <= 0) {
                    sprigs.wanderTimer[i] = CONFIG.WANDER_INTERVAL;
                    
                    const dxNest = px - nestX;
                    const dyNest = py - nestY;
                    const distToNest = Math.sqrt(dxNest*dxNest + dyNest*dyNest);
                    const angleToNest = Math.atan2(-dyNest, -dxNest);
                    
                    let targetAngle = 0;
                    if (distToNest > CONFIG.LEASH_RADIUS) {
                        targetAngle = angleToNest + (Math.random() - 0.5) * 1.5;
                    } else {
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
