import { WorldState } from '../../core/WorldState';
import { SprigState } from '../../data/SprigState';
import { CombatService } from '../services/CombatService';
import { CONFIG } from '../../core/Config';
import { ParticleSystem } from '../ParticleSystem';

import { ScoutService } from '../services/ScoutService';

export class PatrolRunner {
    public static handle(world: WorldState, i: number, jobId: number, combatService: CombatService, dt: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        const targetId = world.jobs.targetId[jobId];
        const signal = structures.find(s => s.id === targetId);

        if (!signal) {
            this.completeJob(world, i, jobId);
            return;
        }

        const state = sprigs.state[i];

        if (state === SprigState.IDLE) {
            sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
        }

        if (state === SprigState.MOVE_TO_SOURCE) {
            // A. Patrol (Orbit Signal)
            // Scan for enemies using ScoutService (prioritize near Signal)
            const enemyId = ScoutService.findBestTarget(world, i, signal.x, signal.y, CONFIG.PATROL_RADIUS * 1.5);

            if (enemyId !== -1) {
                sprigs.state[i] = SprigState.MOVE_TO_SINK; // Transition to Intercept
                sprigs.targetId[i] = enemyId; // Lock target
            } else {
                // Orbit/Wander near signal
                // Check distance to signal
                const dx = sprigs.x[i] - signal.x;
                const dy = sprigs.y[i] - signal.y;
                if (dx*dx + dy*dy > CONFIG.PATROL_RADIUS*CONFIG.PATROL_RADIUS) {
                    // Too far, go back
                    sprigs.targetX[i] = signal.x;
                    sprigs.targetY[i] = signal.y;
                } else {
                    // Timer-based wandering
                    sprigs.timer[i] -= dt;
                    if (sprigs.timer[i] <= 0) {
                        sprigs.timer[i] = CONFIG.WANDER_TMIN + Math.random() * (CONFIG.WANDER_TMAX - CONFIG.WANDER_TMIN);
                        const angle = Math.random() * Math.PI * 2;
                        const dist = Math.random() * (CONFIG.PATROL_RADIUS * 0.8);
                        sprigs.targetX[i] = signal.x + Math.cos(angle) * dist;
                        sprigs.targetY[i] = signal.y + Math.sin(angle) * dist;
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

            // Leash Check
            const dxSignal = sprigs.x[i] - signal.x;
            const dySignal = sprigs.y[i] - signal.y;
            if (dxSignal*dxSignal + dySignal*dySignal > (CONFIG.PATROL_RADIUS * 1.5)**2) {
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
                sprigs.timer[i] = 0; // Ready to attack immediately
                ParticleSystem.spawnEmote(world, i, CONFIG.EMOTE_COMBAT);
            }
        } else if (state === SprigState.HARVESTING) {
            // C. Combat
            const enemyId = sprigs.targetId[i];
            if (!world.sprigs.active[enemyId]) {
                sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
                return;
            }

            // Leash Check
            const dxSignal = sprigs.x[i] - signal.x;
            const dySignal = sprigs.y[i] - signal.y;
            if (dxSignal*dxSignal + dySignal*dySignal > (CONFIG.PATROL_RADIUS * 1.5)**2) {
                sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
                return;
            }

            // Keep chasing
            sprigs.targetX[i] = world.sprigs.x[enemyId];
            sprigs.targetY[i] = world.sprigs.y[enemyId];

            // Cooldown check
            sprigs.timer[i] -= dt;
            
            if (sprigs.timer[i] <= 0) {
                const attack = combatService.getEffectiveStats(i).attack;
                combatService.applyDamage(i, enemyId, attack);
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
