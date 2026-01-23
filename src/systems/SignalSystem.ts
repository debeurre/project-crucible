import { WorldState } from '../core/WorldState';
import { StructureType } from '../data/StructureData';

export class SignalSystem {
    public update(world: WorldState, dt: number) {
        for (let i = world.structures.length - 1; i >= 0; i--) {
            const s = world.structures[i];
            
            if (s.type === StructureType.SIGNAL_HARVEST && s.lifetime !== undefined) {
                s.lifetime -= dt;
                
                if (s.lifetime <= 0) {
                    // Cleanup Jobs
                    if (s.jobs) {
                        for (const jobId of s.jobs) {
                            world.jobs.remove(jobId);
                            // Unassign worker if any
                            // Note: Similar to EraserTool, we rely on JobExecutionSystem to handle the invalid job state
                            // or we can explicitly unassign here.
                            // Let's explicitly unassign for cleanliness.
                            const workerId = world.jobs.assignedSprigId[jobId];
                            if (workerId !== -1) {
                                world.sprigs.jobId[workerId] = -1;
                                // Ideally reset state to IDLE too, but next frame loop will handle it.
                            }
                        }
                    }

                    // Destroy Structure
                    world.structureHash.remove(s);
                    world.structures.splice(i, 1);
                }
            }
        }
    }
}
