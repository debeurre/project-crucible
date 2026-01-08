import { WorldState } from '../core/WorldState';
import { StructureType } from '../data/StructureData';
import { CONFIG } from '../core/Config';

export class HiveMindSystem {
    public update(world: WorldState) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        
        if (!structures) {
            return;
        }

        const count = CONFIG.MAX_SPRIGS;

                        // Cache positions

                        let nestX = 0, nestY = 0, nestR = 30;

                        let cookieX = 0, cookieY = 0, cookieR = 30;

                        

                        for (const s of structures) {

                            if (s.type === StructureType.NEST) { nestX = s.x; nestY = s.y; nestR = s.radius; }

                            if (s.type === StructureType.COOKIE) { cookieX = s.x; cookieY = s.y; cookieR = s.radius; }

                        }

                

                        // Spawning Logic (The Queen)
                        if (world.foodStored >= 10) {
                            if (world.sprigs.spawn(nestX, nestY) !== -1) {
                                world.foodStored -= 10;
                            }
                        }

                        for (let i = 0; i < count; i++) {
                            if (sprigs.active[i] === 0) continue;

                            // 1. Assign Job (if IDLE)
                            if (sprigs.state[i] === 0) {
                                const cargo = sprigs.cargo[i];
                                if (cargo === 0) {
                                    // Go to Cookie
                                    sprigs.targetX[i] = cookieX;
                                    sprigs.targetY[i] = cookieY;
                                    sprigs.state[i] = 1; // MOVING_TO_SOURCE
                                } else {
                                    // Go to Nest
                                    sprigs.targetX[i] = nestX;
                                    sprigs.targetY[i] = nestY;
                                    sprigs.state[i] = 2; // MOVING_TO_SINK
                                }
                            }

                            // 2. Arrival Check (if SEEKING)
                            if (sprigs.state[i] === 1 || sprigs.state[i] === 2) {
                                const px = sprigs.x[i];
                                const py = sprigs.y[i];
                                const tx = sprigs.targetX[i];
                                const ty = sprigs.targetY[i];
                                
                                const dx = px - tx;
                                const dy = py - ty;
                                const distSq = dx*dx + dy*dy;
                                
                                // Determine radius
                                let targetR = 30;
                                if (sprigs.state[i] === 1) targetR = cookieR;
                                if (sprigs.state[i] === 2) targetR = nestR;

                                const minDist = targetR + 10; // Interaction Buffer

                                if (distSq < minDist * minDist) {
                                    // Arrived
                                    if (sprigs.state[i] === 1) {
                                        sprigs.cargo[i] = 1; // Pick up
                                    } else {
                                        sprigs.cargo[i] = 0; // Drop off
                                        world.foodStored++;
                                    }
                                    sprigs.state[i] = 0; // Set to IDLE
                                }
                            }
                        }
    }
}
