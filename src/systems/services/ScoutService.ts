import { WorldState } from '../../core/WorldState';
import { EntityType } from '../../data/EntityData';
import { CONFIG } from '../../core/Config';

export class ScoutService {
    public static findBestTarget(
        world: WorldState, 
        observerId: number, 
        referenceX: number, 
        referenceY: number,
        maxRange: number = Infinity
    ): number {
        const sprigs = world.sprigs;
        const x = sprigs.x[observerId];
        const y = sprigs.y[observerId];
        const maxRangeSq = maxRange * maxRange;
        
        // Query around the observer (what they can see)
        const nearby = world.spatialHash.query(x, y, CONFIG.SPRIG_VIEW_RADIUS);
        
        let bestTargetId = -1;
        let bestScore = Infinity; // Lower score is better (distance sq)

        for (const id of nearby) {
            // Filter: Active Thieves
            if (world.sprigs.active[id] && world.sprigs.type[id] === EntityType.THIEF) {
                // Calculate score: Distance to Reference Point (e.g., Flag)
                const dx = world.sprigs.x[id] - referenceX;
                const dy = world.sprigs.y[id] - referenceY;
                const score = dx*dx + dy*dy;

                if (score < maxRangeSq && score < bestScore) {
                    bestScore = score;
                    bestTargetId = id;
                }
            }
        }

        return bestTargetId;
    }
}
