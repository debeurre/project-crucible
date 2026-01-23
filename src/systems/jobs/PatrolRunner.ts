import { WorldState } from '../../core/WorldState';
import { EntityType } from '../../data/EntityData';
import { SprigState } from '../../data/SprigState';
import { CombatService } from '../../services/CombatService';
import { CONFIG } from '../../core/Config';

export class PatrolRunner {
    public static handle(world: WorldState, i: number, jobId: number, combatService: CombatService) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        const targetId = world.jobs.targetId[jobId];
        const flag = structures.find(s => s.id === targetId);

        if (!flag) {
            this.completeJob(world, i, jobId);
            return;
        }

        const state = sprigs.state[i];

        if (state === SprigState.IDLE) {
            sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
        }

        if (state === SprigState.MOVE_TO_SOURCE) {
            // A. Patrol (Orbit Flag)
            // Scan for enemies
            const nearby = world.spatialHash.query(sprigs.x[i], sprigs.y[i], CONFIG.SPRIG_VIEW_RADIUS);
            let enemyId = -1;
            
            for (const id of nearby) {
                if (world.sprigs.active[id] && world.sprigs.type[id] === EntityType.THIEF) {
                    enemyId = id;
                    break;
                }
            }

            if (enemyId !== -1) {
                sprigs.state[i] = SprigState.MOVE_TO_SINK; // Transition to Intercept
                sprigs.targetId[i] = enemyId; // Lock target
            } else {
                // Orbit/Wander near flag
                // Check distance to flag
                const dx = sprigs.x[i] - flag.x;
                const dy = sprigs.y[i] - flag.y;
                if (dx*dx + dy*dy > CONFIG.PATROL_RADIUS*CONFIG.PATROL_RADIUS) {
                    // Too far, go back
                    sprigs.targetX[i] = flag.x;
                    sprigs.targetY[i] = flag.y;
                } else {
                    // Random patrol point
                    if (Math.random() < 0.05) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = Math.random() * (CONFIG.PATROL_RADIUS * 0.8);
                        sprigs.targetX[i] = flag.x + Math.cos(angle) * dist;
                        sprigs.targetY[i] = flag.y + Math.sin(angle) * dist;
                    }
                }
            }
        } else if (state === SprigState.MOVE_TO_SINK) {
            // B. Intercept
            const enemyId = sprigs.targetId[i];
            if (!world.sprigs.active[enemyId]) {
                // Enemy dead/gone
                sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
                return;
            }

            // Move to enemy
            const ex = world.sprigs.x[enemyId];
            const ey = world.sprigs.y[enemyId];
            sprigs.targetX[i] = ex;
            sprigs.targetY[i] = ey;

            const dx = sprigs.x[i] - ex;
            const dy = sprigs.y[i] - ey;
            const distSq = dx*dx + dy*dy;

            if (distSq < CONFIG.SPRIG_ATTACK_RANGE*CONFIG.SPRIG_ATTACK_RANGE) {
                // Range reached
                sprigs.state[i] = SprigState.HARVESTING; // Combat
            }
        } else if (state === SprigState.HARVESTING) {
            // C. Combat
            const enemyId = sprigs.targetId[i];
            if (!world.sprigs.active[enemyId]) {
                sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
                return;
            }

            // Keep chasing
            sprigs.targetX[i] = world.sprigs.x[enemyId];
            sprigs.targetY[i] = world.sprigs.y[enemyId];

            // Cooldown check (reuse timer?)
            sprigs.timer[i] -= 0.016; // Approx dt, we need dt passed in handle.
            // Let's assume handle gets dt.
            
            if (sprigs.timer[i] <= 0) {
                combatService.applyDamage(i, enemyId, world.sprigs.attack[i]);
                sprigs.timer[i] = CONFIG.SPRIG_ATTACK_COOLDOWN;
            }
            
            // Check distance, if too far, go back to chase
            const dx = sprigs.x[i] - world.sprigs.x[enemyId];
            const dy = sprigs.y[i] - world.sprigs.y[enemyId];
            if (dx*dx + dy*dy > (CONFIG.SPRIG_ATTACK_RANGE + 10)**2) {
                sprigs.state[i] = SprigState.MOVE_TO_SINK;
            }
        }
    }

    private static completeJob(world: WorldState, sprigId: number, jobId: number) {
        world.jobs.unassign(jobId);
        world.jobs.remove(jobId);
        world.sprigs.jobId[sprigId] = -1;
        world.sprigs.state[sprigId] = SprigState.IDLE;
        world.sprigs.timer[sprigId] = 0;
    }
}
