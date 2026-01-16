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
                // Initialize Memory
                if (!s.knownStructures) s.knownStructures = [];

                // A. Scan Local Area (The "Eye")
                const nearby = world.structureHash.query(s.x, s.y, CONFIG.NEST_VIEW_RADIUS);
                for (const other of nearby) {
                    if ((other.type === StructureType.COOKIE || other.type === StructureType.CRUMB || other.type === StructureType.BUSH) && 
                        other.stock && other.stock.count('FOOD') > 0) {
                        
                        // Distance Check (Hash is coarse)
                        const distSq = (other.x - s.x)**2 + (other.y - s.y)**2;
                        if (distSq < CONFIG.NEST_VIEW_RADIUS**2) {
                             if (!s.knownStructures.includes(other.id)) {
                                 s.knownStructures.push(other.id);
                             }
                        }
                    }
                }

                // B. Prune Memory (Forget empty/gone sources)
                for (let i = s.knownStructures.length - 1; i >= 0; i--) {
                    const id = s.knownStructures[i];
                    const struct = structures.find(st => st.id === id);
                    if (!struct || !struct.stock || struct.stock.count('FOOD') <= 0) {
                        s.knownStructures.splice(i, 1);
                    }
                }

                // C. Post Jobs for KNOWN sources
                for (const id of s.knownStructures) {
                    jobs.add(JobType.HARVEST, id, 5);
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
