import { WorldState } from '../core/WorldState';
import { StructureType } from '../data/StructureData';
import { JobType, JobData } from '../data/JobData';
import { SprigState } from '../data/SprigState';
import { CONFIG } from '../core/Config';
import { EntityType } from '../data/EntityData';

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
                this.handleNestLogic(world, s, jobs);
            } else if (s.type === StructureType.SIGNAL_PATROL) {
                this.handlePatrolSignal(s, jobs);
            } else if (s.type === StructureType.SIGNAL_HARVEST) {
                this.handleHarvestSignal(world, s, jobs);
            }
        }

        // 2. Dispatch Jobs (The Boss)
        this.dispatchJobs(jobs, sprigs, structures);
    }

    private handleNestLogic(world: WorldState, s: any, jobs: JobData) {
        // Initialize Memory
        if (!s.knownStructures) s.knownStructures = [];

        // A. Scan Local Area (The "Eye")
        const nearby = world.structureHash.query(s.x, s.y, CONFIG.NEST_VIEW_RADIUS);
        for (const other of nearby) {
            if ((other.type === StructureType.COOKIE || other.type === StructureType.CRUMB || other.type === StructureType.BUSH || other.type === StructureType.BURROW) && 
                other.stock && other.stock.count('FOOD') > 0) {
                
                // Distance Check
                const distSq = (other.x - s.x)**2 + (other.y - s.y)**2;
                if (distSq < CONFIG.NEST_VIEW_RADIUS**2) {
                        if (!s.knownStructures.includes(other.id)) {
                            s.knownStructures.push(other.id);
                        }
                }
            }
        }

        // B. Prune Memory & Post Jobs
        for (let i = s.knownStructures.length - 1; i >= 0; i--) {
            const id = s.knownStructures[i];
            const struct = world.structures.find(st => st.id === id);
            
            // Remove if invalid
            if (!struct || !struct.stock || struct.stock.count('FOOD') <= 0) {
                s.knownStructures.splice(i, 1);
                continue;
            }

            // Dibs Check (Saturation + Buffer)
            const jobCount = this.countJobsForTarget(jobs, JobType.HARVEST, id);
            const unassignedCount = this.countUnassignedJobsForTarget(jobs, JobType.HARVEST, id);
            const capacity = CONFIG.BASE_CARRY_CAPACITY;
            
            // Only add if we need more workers AND buffer isn't full
            if (jobCount * capacity < struct.stock.count('FOOD') && unassignedCount < 5) {
                jobs.add(JobType.HARVEST, id, 5);
            }
        }
    }

    private handleHarvestSignal(world: WorldState, s: any, jobs: JobData) {
        const nearby = world.structureHash.query(s.x, s.y, CONFIG.HARVEST_SIGNAL_RADIUS);
        for (const other of nearby) {
            if ((other.type === StructureType.COOKIE || other.type === StructureType.CRUMB || other.type === StructureType.BUSH || other.type === StructureType.BURROW) &&
                other.stock && other.stock.count('FOOD') > 0) {
                
                // Distance Check
                const distSq = (other.x - s.x)**2 + (other.y - s.y)**2;
                if (distSq < CONFIG.HARVEST_SIGNAL_RADIUS**2) {
                    
                    // Upgrade existing priority
                    this.upgradeJobPriority(jobs, JobType.HARVEST, other.id, 10);

                    // Dibs Check (Saturation + Buffer)
                    const jobCount = this.countJobsForTarget(jobs, JobType.HARVEST, other.id);
                    const unassignedCount = this.countUnassignedJobsForTarget(jobs, JobType.HARVEST, other.id);
                    const capacity = CONFIG.BASE_CARRY_CAPACITY;
                    
                    if (jobCount * capacity < other.stock.count('FOOD') && unassignedCount < 5) {
                        jobs.add(JobType.HARVEST, other.id, 10);
                    }
                }
            }
        }
    }

    private handlePatrolSignal(s: any, jobs: JobData) {
        const existingIdx = this.findJob(jobs, JobType.PATROL, s.id);
        if (existingIdx === -1) {
            jobs.add(JobType.PATROL, s.id, 10);
        }
    }

    private findJob(jobs: JobData, type: JobType, targetId: number): number {
        const max = jobs.active.length;
        for(let i=0; i<max; i++) {
            if (jobs.active[i] && jobs.type[i] === type && jobs.targetId[i] === targetId) {
                return i;
            }
        }
        return -1;
    }

    private countJobsForTarget(jobs: JobData, type: JobType, targetId: number): number {
        let count = 0;
        const max = jobs.active.length;
        for(let i=0; i<max; i++) {
            if (jobs.active[i] && jobs.type[i] === type && jobs.targetId[i] === targetId) {
                count++;
            }
        }
        return count;
    }

    private countUnassignedJobsForTarget(jobs: JobData, type: JobType, targetId: number): number {
        let count = 0;
        const max = jobs.active.length;
        for(let i=0; i<max; i++) {
            if (jobs.active[i] && jobs.type[i] === type && jobs.targetId[i] === targetId && jobs.assignedSprigId[i] === -1) {
                count++;
            }
        }
        return count;
    }

    private upgradeJobPriority(jobs: JobData, type: JobType, targetId: number, newPriority: number) {
        const max = jobs.active.length;
        for(let i=0; i<max; i++) {
            if (jobs.active[i] && jobs.type[i] === type && jobs.targetId[i] === targetId) {
                if (jobs.priority[i] < newPriority) {
                    jobs.priority[i] = newPriority;
                }
            }
        }
    }

    private dispatchJobs(jobs: JobData, sprigs: any, structures: any[]) {
        const activeJobIndices: number[] = [];
        const max = jobs.active.length;
        for (let j = 0; j < max; j++) {
            if (jobs.active[j] && jobs.assignedSprigId[j] === -1) {
                activeJobIndices.push(j);
            }
        }

        activeJobIndices.sort((a, b) => jobs.priority[b] - jobs.priority[a]);

        for (const j of activeJobIndices) {
            let bestDistSq = Infinity;
            let bestWorkerId = -1;

            // Search 1: Idle sprigs
            for (let i = 0; i < sprigs.active.length; i++) {
                if (sprigs.active[i] && sprigs.type[i] === EntityType.SPRIG && sprigs.jobId[i] === -1 && sprigs.state[i] !== SprigState.FORCED_MARCH) {
                    if (jobs.type[j] === JobType.PATROL && sprigs.hungerState[i] > 0) continue;

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

            // Search 2: Fallback for Patrol (Overwrite nearest Green Hauler)
            if (bestWorkerId === -1 && jobs.type[j] === JobType.PATROL) {
                for (let i = 0; i < sprigs.active.length; i++) {
                    if (sprigs.active[i] && sprigs.type[i] === EntityType.SPRIG && sprigs.hungerState[i] === 0) {
                        // "Green" Check (No specialization)
                        const isGreen = sprigs.level_haul[i] === 0 && sprigs.level_fight[i] === 0;
                        if (!isGreen) continue;

                        const currentJobId = sprigs.jobId[i];
                        if (currentJobId !== -1 && jobs.type[currentJobId] === JobType.HARVEST) {
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
                }

                if (bestWorkerId !== -1) {
                    const oldJobId = sprigs.jobId[bestWorkerId];
                    jobs.unassign(oldJobId);
                }
            }

            if (bestWorkerId !== -1) {
                jobs.assign(j, bestWorkerId);
                sprigs.jobId[bestWorkerId] = j;
                sprigs.state[bestWorkerId] = SprigState.MOVE_TO_SOURCE; 
            }
        }
    }
}
