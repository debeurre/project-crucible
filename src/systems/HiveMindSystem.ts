import { WorldState } from '../core/WorldState';
import { StructureType } from '../data/StructureData';
import { CONFIG } from '../core/Config';

export class HiveMindSystem {
    public update(world: WorldState) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        
        if (!structures) {
            // console.error("HiveMindSystem: world.structures is undefined!");
            return;
        }

        const count = CONFIG.MAX_SPRIGS;

        // Cache positions
        let nestX = 0, nestY = 0, cookieX = 0, cookieY = 0;
        for (const s of structures) {
            if (s.type === StructureType.NEST) { nestX = s.x; nestY = s.y; }
            if (s.type === StructureType.COOKIE) { cookieX = s.x; cookieY = s.y; }
        }

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            const cargo = sprigs.cargo[i];
            const px = sprigs.x[i];
            const py = sprigs.y[i];

            // Assign Target
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

            // Interaction Check
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];
            const dx = px - tx;
            const dy = py - ty;
            const distSq = dx*dx + dy*dy;

            if (distSq < 100) { // 10px radius
                if (cargo === 0 && sprigs.state[i] === 1) {
                    sprigs.cargo[i] = 1; // Pick up
                } else if (cargo === 1 && sprigs.state[i] === 2) {
                    sprigs.cargo[i] = 0; // Drop off
                }
            }
        }
    }
}
