import { WorldState } from '../core/WorldState';
import { JobType } from '../data/JobData';
import { StructureType, getStructureStats } from '../data/StructureData';
import { CONFIG } from '../core/Config';
import { SprigState } from '../data/SprigState';

export class JobExecutionSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const jobs = world.jobs;

        if (!jobs) return; // Handle HMR edge case

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;

            const jobId = sprigs.jobId[i];
            
            if (jobId === -1) {
                this.handleIdle(sprigs, i, dt);
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

    private handleIdle(sprigs: any, i: number, dt: number) {
        sprigs.timer[i] -= dt;
        if (sprigs.timer[i] <= 0) {
            sprigs.timer[i] = CONFIG.WANDER_TMIN + Math.random() * (CONFIG.WANDER_TMAX - CONFIG.WANDER_TMIN);
            const angle = Math.random() * Math.PI * 2;
            sprigs.targetX[i] = sprigs.x[i] + Math.cos(angle) * CONFIG.WANDER_DIST;
            sprigs.targetY[i] = sprigs.y[i] + Math.sin(angle) * CONFIG.WANDER_DIST;
        }
    }

    private handleHarvest(world: WorldState, i: number, jobId: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        const state = sprigs.state[i];
        
        const targetId = world.jobs.targetId[jobId];
        const source = structures.find(s => s.id === targetId);

        if (!source || !source.stock || (source.stock.count('FOOD') <= 0 && sprigs.stock[i].count('FOOD') <= 0)) {
            this.completeJob(world, i, jobId);
            return;
        }

        if (state === SprigState.MOVE_TO_SOURCE) {
            sprigs.targetX[i] = source.x;
            sprigs.targetY[i] = source.y;
            
            const dx = sprigs.x[i] - source.x;
            const dy = sprigs.y[i] - source.y;
            const distSq = dx*dx + dy*dy;
            const range = getStructureStats(source.type).radius + 15;

            if (distSq < range * range) {
                if (source.stock.remove('FOOD', 1)) {
                    sprigs.stock[i].add('FOOD', 1);
                    sprigs.state[i] = SprigState.MOVE_TO_SINK;
                } else {
                    this.completeJob(world, i, jobId);
                }
            }
        } else if (state === SprigState.MOVE_TO_SINK) {
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
                
                // Repeat logic
                if (source.stock.count('FOOD') > 0) {
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
