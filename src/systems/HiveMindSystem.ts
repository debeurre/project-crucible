import { WorldState } from '../core/WorldState';
import { StructureType, getStructureStats } from '../data/StructureData';
import { CONFIG } from '../core/Config';

export class HiveMindSystem {
    public update(world: WorldState) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        
        if (!structures) return;

        // 1. Nest Logic: Spawning
        for (const s of structures) {
            if (s.type === StructureType.NEST && s.stock) {
                if (s.stock.count('FOOD') >= 10) {
                    // Try to spawn
                    if (world.sprigs.spawn(s.x, s.y) !== -1) {
                        s.stock.remove('FOOD', 10);
                    }
                }
            }
        }

        // 2. Sprig Logic
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            const state = sprigs.state[i];
            const px = sprigs.x[i];
            const py = sprigs.y[i];

            // --- JOB ASSIGNMENT ---
            if (state === 0) { // IDLE
                const cargo = sprigs.cargo[i];
                let bestDistSq = Infinity;
                let bestTarget = null;

                if (cargo === 0) {
                    // Needs Food: Find nearest Cookie with stock
                    for (const s of structures) {
                        if (s.type === StructureType.COOKIE && s.stock && s.stock.count('FOOD') > 0) {
                            const dx = s.x - px;
                            const dy = s.y - py;
                            const distSq = dx*dx + dy*dy;
                            if (distSq < bestDistSq) {
                                bestDistSq = distSq;
                                bestTarget = s;
                            }
                        }
                    }
                    if (bestTarget) {
                        sprigs.targetId[i] = bestTarget.id;
                        sprigs.targetX[i] = bestTarget.x;
                        sprigs.targetY[i] = bestTarget.y;
                        sprigs.state[i] = 1; // MOVING_TO_SOURCE
                    }
                } else {
                    // Has Food: Find nearest Nest
                    for (const s of structures) {
                        if (s.type === StructureType.NEST) {
                            const dx = s.x - px;
                            const dy = s.y - py;
                            const distSq = dx*dx + dy*dy;
                            if (distSq < bestDistSq) {
                                bestDistSq = distSq;
                                bestTarget = s;
                            }
                        }
                    }
                    if (bestTarget) {
                        sprigs.targetId[i] = bestTarget.id;
                        sprigs.targetX[i] = bestTarget.x;
                        sprigs.targetY[i] = bestTarget.y;
                        sprigs.state[i] = 2; // MOVING_TO_SINK
                    }
                }
            }

            // --- MOVEMENT / ACTION ---
            if (state === 1 || state === 2) {
                const tx = sprigs.targetX[i];
                const ty = sprigs.targetY[i];
                const dx = px - tx;
                const dy = py - ty;
                const distSq = dx*dx + dy*dy;

                // Check if target still exists
                const targetId = sprigs.targetId[i];
                const target = structures.find(s => s.id === targetId);
                
                if (!target) {
                    // Target destroyed
                    sprigs.state[i] = 0;
                    sprigs.targetId[i] = -1;
                    continue;
                }

                const stats = getStructureStats(target.type);
                const minDist = stats.radius + 10;

                if (distSq < minDist * minDist) {
                    // Arrived
                    if (state === 1) {
                        // At Source (Cookie)
                        if (target.stock && target.stock.remove('FOOD', 1)) {
                            sprigs.cargo[i] = 1;
                        }
                        // Whether successful or not (maybe emptied just now), return to IDLE to re-evaluate
                        sprigs.state[i] = 0;
                        sprigs.targetId[i] = -1;
                    } else if (state === 2) {
                        // At Sink (Nest)
                        if (target.stock && target.stock.add('FOOD', 1)) {
                            sprigs.cargo[i] = 0;
                        }
                        sprigs.state[i] = 0;
                        sprigs.targetId[i] = -1;
                    }
                }
            }
        }
    }
}
