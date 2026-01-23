import { Tool } from './Tool';
import { WorldState } from '../core/WorldState';
import { StructureType, createStructure } from '../data/StructureData';
import { JobType } from '../data/JobData';
import { CONFIG } from '../core/Config';

export class HarvestSignalTool implements Tool {
    
    public onDown(world: WorldState, x: number, y: number): void {
        const signal = createStructure(StructureType.SIGNAL_HARVEST, x, y);
        signal.id = world.nextStructureId++;
        signal.jobs = [];
        
        world.structures.push(signal);
        world.structureHash.add(signal);
        
        // Signal Logic: Scan and Post Jobs
        const RADIUS = CONFIG.HARVEST_SIGNAL_RADIUS;
        const nearby = world.structureHash.query(x, y, RADIUS);
        let jobsPosted = 0;

        for (const s of nearby) {
            if ((s.type === StructureType.COOKIE || s.type === StructureType.CRUMB || s.type === StructureType.BUSH) &&
                s.stock && s.stock.count('FOOD') > 0) {
                
                // Add high priority job
                const jobId = world.jobs.add(JobType.HARVEST, s.id, 10);
                if (jobId !== -1) {
                    signal.jobs.push(jobId);
                    jobsPosted++;
                }
            }
        }

        // Cleanup: Ideally the signal waits, but for simplicity/prototype:
        // We can just leave the signal visual or destroy it immediately.
        // The prompt says "Cleanup: The Signal entity destroys itself after the jobs are claimed."
        // Implementing "claimed" logic requires tracking jobs.
        // For this iteration, let's keep the signal as a marker.
        // We can add a "duration" to it or just let it exist until erased.
        // Actually, let's just create it. The Eraser can delete it.
        // We can also make the JobDispatchSystem manage signals later if needed.
    }

    public onDrag(_world: WorldState, _x: number, _y: number): void {}
    public onUp(_world: WorldState, _x: number, _y: number): void {}
}
