import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

const DEG_TO_RAD = Math.PI / 180;

export class NavigationSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;

            // Step 1: Timer Tick
            sprigs.timer[i] -= dt;
            const currentSpeed = sprigs.speed[i];

            // Step 2: The Pulse
            if (sprigs.timer[i] <= 0) {
                // Reset Timer
                sprigs.timer[i] = CONFIG.WANDER_TMIN + Math.random() * (CONFIG.WANDER_TMAX - CONFIG.WANDER_TMIN);

                // Check Home
                const homeId = sprigs.homeID[i];
                let home = undefined;
                
                // Find home structure if ID is valid
                if (homeId !== -1) {
                    home = structures.find(s => s.id === homeId);
                    // If home destroyed/gone, reset ID
                    if (!home) sprigs.homeID[i] = -1;
                }

                if (!home) {
                    // Case A: Homeless - Scan for Nest
                    let nearestDistSq = Infinity;
                    let nearestNest = null;

                    for (const s of structures) {
                        if (s.type === StructureType.NEST) {
                            const dx = s.x - sprigs.x[i];
                            const dy = s.y - sprigs.y[i];
                            const distSq = dx * dx + dy * dy;
                            if (distSq < nearestDistSq) {
                                nearestDistSq = distSq;
                                nearestNest = s;
                            }
                        }
                    }

                    if (nearestNest) {
                        // Found a home
                        sprigs.homeID[i] = nearestNest.id;
                        sprigs.targetX[i] = nearestNest.x;
                        sprigs.targetY[i] = nearestNest.y;
                        sprigs.speed[i] = CONFIG.MAX_SPEED; // Sprint
                    } else {
                        // Panic / Wander
                        const angle = Math.random() * Math.PI * 2;
                        sprigs.targetX[i] = sprigs.x[i] + Math.cos(angle) * CONFIG.WANDER_DIST;
                        sprigs.targetY[i] = sprigs.y[i] + Math.sin(angle) * CONFIG.WANDER_DIST;
                        sprigs.speed[i] = CONFIG.WANDER_SPEED;
                    }
                } else {
                    // Case B: Leashed
                    const sx = sprigs.x[i];
                    const sy = sprigs.y[i];
                    const hx = home.x;
                    const hy = home.y;

                    const dx = sx - hx;
                    const dy = sy - hy;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    let baseAngle = 0;
                    let variance = 0;

                    if (dist < CONFIG.LEASH_RADIUS) {
                        // Inside: Away from home
                        baseAngle = Math.atan2(sy - hy, sx - hx);
                        variance = (Math.random() - 0.5) * (135 * 2 * DEG_TO_RAD);
                    } else {
                        // Outside: Towards home
                        baseAngle = Math.atan2(hy - sy, hx - sx);
                        variance = (Math.random() - 0.5) * (45 * 2 * DEG_TO_RAD);
                    }

                    const angle = baseAngle + variance;
                    sprigs.targetX[i] = sx + Math.cos(angle) * CONFIG.WANDER_DIST;
                    sprigs.targetY[i] = sy + Math.sin(angle) * CONFIG.WANDER_DIST;
                    sprigs.speed[i] = CONFIG.WANDER_SPEED;
                }
            }

            // Step 3: Move (Seek)
            const dx = sprigs.targetX[i] - sprigs.x[i];
            const dy = sprigs.targetY[i] - sprigs.y[i];
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                sprigs.vx[i] = (dx / dist) * currentSpeed;
                sprigs.vy[i] = (dy / dist) * currentSpeed;
            } else {
                sprigs.vx[i] = 0;
                sprigs.vy[i] = 0;
            }
        }
    }
}