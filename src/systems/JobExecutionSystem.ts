import { WorldState } from '../core/WorldState';
import { JobType } from '../data/JobData';
import { StructureType, getStructureStats } from '../data/StructureData';
import { CONFIG } from '../core/Config';
import { SprigState } from '../data/SprigState';

const DEG_TO_RAD = Math.PI / 180;

export class JobExecutionSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const jobs = world.jobs;

        if (!jobs) return; // Handle HMR edge case

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;

            const jobId = sprigs.jobId[i];
            
            if (jobId === -1) {
                this.handleIdle(world, i, dt);
                continue;
            }

            // Verify Job
            if (!jobs.active[jobId] || jobs.assignedSprigId[jobId] !== i) {
                sprigIdToIdle(world, i);
                continue;
            }

            const type = jobs.type[jobId];
            if (type === JobType.HARVEST) {
                this.handleHarvest(world, i, jobId);
            }
        }
    }

    private handleIdle(world: WorldState, i: number, dt: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;

        // 1. Find Home if homeless
        if (sprigs.homeID[i] === -1) {
             let bestDistSq = Infinity;
             let bestNest = null;
             for (const s of structures) {
                 if (s.type === StructureType.NEST) {
                     const dx = sprigs.x[i] - s.x;
                     const dy = sprigs.y[i] - s.y;
                     const distSq = dx*dx + dy*dy;
                     if (distSq < bestDistSq) {
                         bestDistSq = distSq;
                         bestNest = s;
                     }
                 }
             }
             if (bestNest) {
                 sprigs.homeID[i] = bestNest.id;
             }
        }

        // 2. Wander Logic
        sprigs.timer[i] -= dt;
        if (sprigs.timer[i] <= 0) {
            sprigs.timer[i] = CONFIG.WANDER_TMIN + Math.random() * (CONFIG.WANDER_TMAX - CONFIG.WANDER_TMIN);
            
            const homeId = sprigs.homeID[i];
            const home = homeId !== -1 ? structures.find(s => s.id === homeId) : null;

            if (home) {
                // Leash Logic
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
                    variance = (Math.random() - 0.5) * (90 * 2 * DEG_TO_RAD);
                } else {
                    // Outside: Towards home
                    baseAngle = Math.atan2(hy - sy, hx - sx);
                    variance = (Math.random() - 0.5) * (45 * 2 * DEG_TO_RAD);
                }

                const angle = baseAngle + variance;
                sprigs.targetX[i] = sx + Math.cos(angle) * CONFIG.WANDER_DIST;
                sprigs.targetY[i] = sy + Math.sin(angle) * CONFIG.WANDER_DIST;
            } else {
                // Random Walk (Panic)
                const angle = Math.random() * Math.PI * 2;
                sprigs.targetX[i] = sprigs.x[i] + Math.cos(angle) * CONFIG.WANDER_DIST;
                sprigs.targetY[i] = sprigs.y[i] + Math.sin(angle) * CONFIG.WANDER_DIST;
            }
        }
    }

    private handleHarvest(world: WorldState, i: number, jobId: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        const state = sprigs.state[i];
        
        const targetId = world.jobs.targetId[jobId];
        const source = structures.find(s => s.id === targetId);
        const carrying = sprigs.stock[i].count('FOOD') > 0;

        // Validation: If source is gone/empty AND we aren't carrying anything, abort.
        if ((!source || !source.stock || source.stock.count('FOOD') <= 0) && !carrying) {
            this.completeJob(world, i, jobId);
            return;
        }

        // If source is bad but we are carrying, ensure we are delivering
        if ((!source || !source.stock || source.stock.count('FOOD') <= 0) && carrying && state !== SprigState.MOVE_TO_SINK) {
            sprigs.state[i] = SprigState.MOVE_TO_SINK;
        }

        if (sprigs.state[i] === SprigState.MOVE_TO_SOURCE) {
            if (!source) return; // Should be handled above, but safety first

            sprigs.targetX[i] = source.x;
            sprigs.targetY[i] = source.y;
            
            const dx = sprigs.x[i] - source.x;
            const dy = sprigs.y[i] - source.y;
            const distSq = dx*dx + dy*dy;
            const range = getStructureStats(source.type).radius + 15;

            if (distSq < range * range) {
                if (source.stock && source.stock.remove('FOOD', 1)) {
                    sprigs.stock[i].add('FOOD', 1);
                    sprigs.state[i] = SprigState.MOVE_TO_SINK;
                } else {
                    this.completeJob(world, i, jobId);
                }
            }
        } else if (sprigs.state[i] === SprigState.MOVE_TO_SINK) {
            let nest = null;
            if (sprigs.homeID[i] !== -1) {
                nest = structures.find(s => s.id === sprigs.homeID[i]);
            }
            if (!nest) {
                nest = structures.find(s => s.type === StructureType.NEST);
            }

            if (!nest) return; 

            sprigs.targetX[i] = nest.x;
            sprigs.targetY[i] = nest.y;

            const dx = sprigs.x[i] - nest.x;
            const dy = sprigs.y[i] - nest.y;
            const distSq = dx*dx + dy*dy;
            const range = getStructureStats(nest.type).radius + 15;

            if (distSq < range * range) {
                if (nest.stock && sprigs.stock[i].remove('FOOD', 1)) {
                    nest.stock.add('FOOD', 1);
                }
                
                // Repeat logic: Check if source is still valid
                if (source && source.stock && source.stock.count('FOOD') > 0) {
                    sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
                } else {
                    this.completeJob(world, i, jobId);
                }
            }
        } else {
            sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
        }
    }

    private completeJob(world: WorldState, sprigId: number, jobId: number) {
        world.jobs.unassign(jobId);
        world.jobs.remove(jobId);
        sprigIdToIdle(world, sprigId);
    }
}

function sprigIdToIdle(world: WorldState, id: number) {
    world.sprigs.jobId[id] = -1;
    world.sprigs.state[id] = SprigState.IDLE;
    world.sprigs.timer[id] = 0; // Trigger immediate wander
}