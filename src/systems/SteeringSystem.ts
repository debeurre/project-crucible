import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { SpatialHash } from '../core/SpatialHash';
import { getStructureStats } from '../data/StructureData';

import { SprigState } from '../data/SprigState';

export class SteeringSystem {
    public update(world: WorldState) {
        if (!world.spatialHash) {
            world.spatialHash = new SpatialHash(CONFIG.GRID_SIZE * 2);
        }
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

            // FORCED MARCH OVERRIDE (Path Following)
            if (sprigs.state[i] === SprigState.FORCED_MARCH) {
                const pathId = sprigs.pathId[i];
                let tx = sprigs.targetX[i];
                let ty = sprigs.targetY[i];

                // If on a valid path, use waypoints
                if (pathId !== -1 && world.paths.active[pathId]) {
                    const targetIdx = sprigs.pathTargetIdx[i];
                    const p = world.paths.getPoint(pathId, targetIdx);
                    if (p) {
                        tx = p.x;
                        ty = p.y;
                    }
                }

                const dx = tx - x;
                const dy = ty - y;
                const distSq = dx * dx + dy * dy;

                if (distSq > 400) { // 20px waypoint tolerance
                    const dist = Math.sqrt(distSq);
                    const desireX = (dx / dist) * sprigs.speed[i];
                    const desireY = (dy / dist) * sprigs.speed[i];
                    ax += (desireX - sprigs.vx[i]) * 5.0;
                    ay += (desireY - sprigs.vy[i]) * 5.0;
                } else {
                    // Advance Waypoint or Finish
                    if (pathId !== -1 && world.paths.active[pathId]) {
                        sprigs.pathTargetIdx[i]++;
                        if (sprigs.pathTargetIdx[i] >= world.paths.pointsCount[pathId]) {
                            // End of path
                            sprigs.state[i] = SprigState.IDLE;
                            sprigs.pathId[i] = -1;
                        } else {
                            // Update target for next frame
                            const nextP = world.paths.getPoint(pathId, sprigs.pathTargetIdx[i]);
                            if (nextP) {
                                sprigs.targetX[i] = nextP.x;
                                sprigs.targetY[i] = nextP.y;
                            }
                        }
                    } else {
                        // No path or path invalid -> Arrived at single point
                        sprigs.state[i] = SprigState.IDLE;
                    }
                }
                
                sprigs.ax[i] = ax;
                sprigs.ay[i] = ay;
                continue;
            }

            // SEEK (Target)
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];
            const dx = tx - x;
            const dy = ty - y;
            const distSq = dx * dx + dy * dy;
            
            // Only seek if distance > 1
            if (distSq > 1) {
                const dist = Math.sqrt(distSq);
                
                // ARRIVAL LOGIC
                const SLOWING_RADIUS = 50.0;
                let desiredSpeed = sprigs.speed[i];
                if (dist < SLOWING_RADIUS) {
                    desiredSpeed = desiredSpeed * (dist / SLOWING_RADIUS);
                }

                // Desire: Scaled Speed towards target
                const desireX = (dx / dist) * desiredSpeed;
                const desireY = (dy / dist) * desiredSpeed;
                
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

            // OBSTACLE AVOIDANCE
            let avoidX = 0;
            let avoidY = 0;
            let avoidCount = 0;
            const buffer = 5.0;

            for (const s of world.structures) {
                const stats = getStructureStats(s.type);
                if (stats.solid) { // Rocks
                    const sdx = x - s.x;
                    const sdy = y - s.y;
                    const sDistSq = sdx*sdx + sdy*sdy;
                    const combinedRadius = stats.radius + 15.0; // Sprig Radius
                    const checkDist = combinedRadius + buffer;
                    
                    if (sDistSq < checkDist * checkDist) {
                        const sDist = Math.sqrt(sDistSq) || 0.001;
                        
                        // Radial (Away from rock)
                        const radialX = sdx / sDist;
                        const radialY = sdy / sDist;

                        // Tangent (Perpendicular) (-y, x)
                        const t1x = -radialY;
                        const t1y = radialX;
                        
                        // Dot product with velocity to pick side
                        const dot = t1x * sprigs.vx[i] + t1y * sprigs.vy[i];
                        const tangentX = dot > 0 ? t1x : -t1x;
                        const tangentY = dot > 0 ? t1y : -t1y;

                        // Weighted Sum (Slide)
                        const forceX = (radialX * 0.6) + (tangentX * 0.4);
                        const forceY = (radialY * 0.6) + (tangentY * 0.4);

                        // Weight by proximity
                        const weight = 1.0 - ((sDist - combinedRadius) / buffer);
                        const clampedWeight = Math.max(0, Math.min(1, weight));
                        
                        avoidX += forceX * clampedWeight;
                        avoidY += forceY * clampedWeight;
                        avoidCount++;
                    }
                }
            }

            // Cumulative Decay Logic
            const DECAY = 0.7; // Retain 70% of previous avoidance momentum
            sprigs.avoidAx[i] *= DECAY;
            sprigs.avoidAy[i] *= DECAY;

            if (avoidCount > 0) {
                // Normalize and Scale
                const len = Math.sqrt(avoidX*avoidX + avoidY*avoidY) || 1;
                const maxSpeed = sprigs.speed[i];
                const inputX = (avoidX / len) * maxSpeed;
                const inputY = (avoidY / len) * maxSpeed;

                // Add to accumulator (Lerp towards new input?)
                // Or just add? Adding might explode.
                // Let's Lerp the accumulator towards the input
                const INPUT_WEIGHT = 0.2; // 20% new input, 80% history (via decay)
                
                sprigs.avoidAx[i] += (inputX - sprigs.vx[i]) * CONFIG.STEER_AVOID_WEIGHT * INPUT_WEIGHT;
                sprigs.avoidAy[i] += (inputY - sprigs.vy[i]) * CONFIG.STEER_AVOID_WEIGHT * INPUT_WEIGHT;
            }
            
            // Apply Accumulated Avoidance
            ax += sprigs.avoidAx[i];
            ay += sprigs.avoidAy[i];

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
                    const ndist = Math.sqrt(ndistSq) || 0.001;
                    
                    // Hard Separation (Anti-Jitter Nudge)
                    if (ndist < 5.0) {
                        const nudge = (5.0 - ndist) * 0.5; // Push apart half the overlap
                        const nx = (ndx / ndist) * nudge;
                        const ny = (ndy / ndist) * nudge;
                        sprigs.x[i] += nx;
                        sprigs.y[i] += ny;
                    }

                    // Soft Separation: Steering Force
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
                let sForceX = (sepX - sprigs.vx[i]);
                let sForceY = (sepY - sprigs.vy[i]);

                // Clamp Separation Force (Anti-Jitter)
                const MAX_SEP_FORCE = 100.0;
                const sForceLenSq = sForceX*sForceX + sForceY*sForceY;
                if (sForceLenSq > MAX_SEP_FORCE * MAX_SEP_FORCE) {
                    const sfLen = Math.sqrt(sForceLenSq);
                    sForceX = (sForceX / sfLen) * MAX_SEP_FORCE;
                    sForceY = (sForceY / sfLen) * MAX_SEP_FORCE;
                }

                ax += sForceX * CONFIG.STEER_SEPARATION_WEIGHT;
                ay += sForceY * CONFIG.STEER_SEPARATION_WEIGHT;
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