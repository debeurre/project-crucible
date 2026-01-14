import { WorldState } from '../core/WorldState';
import { StructureType } from '../data/StructureData';
import { JobType, JobData } from '../data/JobData';
import { SprigState } from '../data/SprigState';
import { CONFIG } from '../core/Config';

export class JobDispatchSystem {
    private frameCount: number = 0;

    public update(world: WorldState) {
        this.frameCount++;
        if (this.frameCount % 10 !== 0) return; // Run every 10 frames

        if (!world.jobs) {
            world.jobs = new JobData();
        }

        const jobs = world.jobs;
        const sprigs = world.sprigs;
        const structures = world.structures;

        // 1. Post Jobs (Producers)
        for (const s of structures) {
            if (s.type === StructureType.NEST && s.stock) {
                // Survival: Need Food? Find food
                // Nests are now 'greedy' (always interested in food)
                // Simple logic: Find a resource, post a job to harvest it.
                
                // Find a resource
                const resource = structures.find(r => 
                    (r.type === StructureType.COOKIE || r.type === StructureType.CRUMB) && 
                    r.stock && r.stock.count('FOOD') > 0 &&
                    ((r.x - s.x)**2 + (r.y - s.y)**2 < CONFIG.NEST_VIEW_RADIUS**2)
                );

                if (resource) {
                    jobs.add(JobType.HARVEST, resource.id, 5); // Priority 5
                }
            }
        }

        // 2. Dispatch Jobs (The Boss)
        // Iterate Open Jobs
        for (let j = 0; j < jobs.count; j++) {
            if (jobs.active[j] && jobs.assignedSprigId[j] === -1) {
                // Find a worker
                let bestDistSq = Infinity;
                let bestWorkerId = -1;

                // Simple: Find nearest idle sprig
                // Optimization: Use SpatialHash if available, but linear scan for 500 sprigs is fine for now
                for (let i = 0; i < sprigs.active.length; i++) {
                    if (sprigs.active[i] && sprigs.jobId[i] === -1) {
                        // Check distance to target? 
                        // We need target position.
                        // Job stores targetId. Look up structure.
                        const targetStruct = structures.find(s => s.id === jobs.targetId[j]);
                        if (targetStruct) {
                            const dx = sprigs.x[i] - targetStruct.x;
                            const dy = sprigs.y[i] - targetStruct.y;
                            const distSq = dx*dx + dy*dy;
                            if (distSq < bestDistSq) {
                                bestDistSq = distSq;
                                bestWorkerId = i;
                            }
                        }
                    }
                }

                if (bestWorkerId !== -1) {
                    // Assign
                    jobs.assign(j, bestWorkerId);
                    sprigs.jobId[bestWorkerId] = j;
                    // Reset worker state to MOVE_TO_SOURCE
                    sprigs.state[bestWorkerId] = SprigState.MOVE_TO_SOURCE; 
                }
            }
        }
    }
}
