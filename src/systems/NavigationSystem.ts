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
                        else if (t >= lookAhead) { closeX = rayEndX; closeY = rayEndY; }
                        
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
                    else if (t >= lookAhead) { closeX = rayEndX; closeY = rayEndY; }

                    let normalX = closeX - mostThreatening.x;
                    let normalY = closeY - mostThreatening.y; 
                    const len = Math.sqrt(normalX*normalX + normalY*normalY);
                    
                    if (len > 0.001) {
                        normalX /= len;
                        normalY /= len;
                        
                        // Velocity Projection: Remove component into wall
                        const dot = vx * normalX + vy * normalY;
                        const slideVx = vx - (dot * normalX);
                        const slideVy = vy - (dot * normalY);
                        
                        // Safety Push (out of wall)
                        const pushVx = normalX * 10;
                        const pushVy = normalY * 10;
                        
                        // Overwrite Velocity directly
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

            // 4. Wander
            if (sprigs.cargo[i] === 0 && !hasFlow) {
                sprigs.wanderTimer[i] -= dt * 1000;
                if (sprigs.wanderTimer[i] <= 0) {
                    sprigs.wanderTimer[i] = CONFIG.WANDER_INTERVAL;
                    // ... (Wander logic from Phase 4 is preserved? Or simplified?)
                    // The prompt didn't ask to change wander logic, but "Wander (The Fallback)" logic was simple random in previous "Fix Stuck" instructions.
                    // But in Phase 4 "Leashed Wander", I implemented robust logic.
                    // I should preserve Leashed Wander logic here.
                    
                    // Re-implementing Leashed Wander Logic inline or reusing
                    // Since I'm overwriting the file, I need to put it back.
                    // Copying logic from previous turn.
                    
                    // Need nestX/Y (already computed at top)
                    // Wait, nestX/Y is computed at start of update.
                    
                    // Find Nest (Iterate structures if not cached?)
                    // It's cached at top of update.
                    // But `update` function scope has access.
                    
                    const dxNest = px - nestX; // Using nestX from closure?
                    // Wait, nestX is defined in the loop at the top. It's available.
                    // But I need to ensure it's available.
                    // Yes, I kept the top loop.
                    
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

            // 5. Seek
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