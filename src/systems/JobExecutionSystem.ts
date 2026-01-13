import { WorldState } from '../core/WorldState';
import { JobType } from '../data/JobData';
import { StructureType, getStructureStats } from '../data/StructureData';
import { CONFIG } from '../core/Config';

export class JobExecutionSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const jobs = world.jobs;

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;

            const jobId = sprigs.jobId[i];
            
            if (jobId === -1) {
                this.handleIdle(sprigs, i, dt);
                continue;
            }

            // Verify Job
            if (!jobs.active[jobId] || jobs.assignedSprigId[jobId] !== i) {
                sprigs.jobId[i] = -1; // Job lost
                continue;
            }

            const type = jobs.type[jobId];
            if (type === JobType.HARVEST) {
                this.handleHarvest(world, i, jobId);
            }
        }
    }

    private handleIdle(sprigs: any, i: number, dt: number) {
        // Migration of NavigationSystem Wander Logic
        sprigs.timer[i] -= dt;
        if (sprigs.timer[i] <= 0) {
            sprigs.timer[i] = CONFIG.WANDER_TMIN + Math.random() * (CONFIG.WANDER_TMAX - CONFIG.WANDER_TMIN);
            // Random Walk
            const angle = Math.random() * Math.PI * 2;
            sprigs.targetX[i] = sprigs.x[i] + Math.cos(angle) * CONFIG.WANDER_DIST;
            sprigs.targetY[i] = sprigs.y[i] + Math.sin(angle) * CONFIG.WANDER_DIST;
        }
    }

    private handleHarvest(world: WorldState, i: number, jobId: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        const state = sprigs.state[i];
        
        // 0: Init/Move to Source
        // 1: Harvesting (Not used yet, instantaneous)
        // 2: Move to Sink
        // 3: Depositing

        const targetId = world.jobs.targetId[jobId];
        const source = structures.find(s => s.id === targetId);

        if (!source || !source.stock || source.stock.count('FOOD') <= 0) {
            // Job Failed / Done
            this.completeJob(world, i, jobId);
            return;
        }

        if (state === 0) { // Move to Source
            sprigs.targetX[i] = source.x;
            sprigs.targetY[i] = source.y;
            
            const dx = sprigs.x[i] - source.x;
            const dy = sprigs.y[i] - source.y;
            const distSq = dx*dx + dy*dy;
            const range = getStructureStats(source.type).radius + 15;

            if (distSq < range * range) {
                // Arrived
                if (source.stock.remove('FOOD', 1)) {
                    sprigs.cargo[i] = 1;
                    sprigs.state[i] = 2; // Move to Sink
                } else {
                    this.completeJob(world, i, jobId);
                }
            }
        } else if (state === 2) { // Move to Sink
            // Find nearest Nest
            // Optimization: Cache nest ID in EntityData? For now, scan.
            // Or use homeID if set.
            let nest = null;
            if (sprigs.homeID[i] !== -1) {
                nest = structures.find(s => s.id === sprigs.homeID[i]);
            }
            if (!nest) {
                nest = structures.find(s => s.type === StructureType.NEST);
            }

            if (!nest) {
                // No nest? Panic/Idle.
                return; 
            }

            sprigs.targetX[i] = nest.x;
            sprigs.targetY[i] = nest.y;

            const dx = sprigs.x[i] - nest.x;
            const dy = sprigs.y[i] - nest.y;
            const distSq = dx*dx + dy*dy;
            const range = getStructureStats(nest.type).radius + 15;

            if (distSq < range * range) {
                // Arrived
                if (nest.stock) nest.stock.add('FOOD', 1);
                sprigs.cargo[i] = 0;
                
                // Repeat?
                if (source.stock.count('FOOD') > 0) {
                    sprigs.state[i] = 0; // Back to Source
                } else {
                    this.completeJob(world, i, jobId);
                }
            }
        }
    }

    private completeJob(world: WorldState, sprigId: number, jobId: number) {
        world.sprigs.jobId[sprigId] = -1;
        world.sprigs.state[sprigId] = 0;
        world.jobs.unassign(jobId);
        world.jobs.remove(jobId);
    }
}
