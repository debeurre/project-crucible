export const MAX_JOBS = 1000;

export enum JobType {
    IDLE = 0,
    HARVEST = 1,
    BUILD = 2,
    HAUL = 3,
    ATTACK = 4
}

export class JobData {
    // Structure of Arrays (SoA)
    public active: Uint8Array;
    public type: Uint8Array;
    public priority: Uint8Array;
    public targetId: Int32Array;      // The primary target (Resource, etc.)
    public assignedSprigId: Int32Array; // The worker (-1 if unassigned)
    
    public count: number;

    constructor() {
        this.active = new Uint8Array(MAX_JOBS);
        this.type = new Uint8Array(MAX_JOBS);
        this.priority = new Uint8Array(MAX_JOBS);
        this.targetId = new Int32Array(MAX_JOBS).fill(-1);
        this.assignedSprigId = new Int32Array(MAX_JOBS).fill(-1);
        this.count = 0;
    }

    public add(type: JobType, targetId: number, priority: number = 1): number {
        if (this.count >= MAX_JOBS) return -1;

        // Simple linear scan for free slot (can be optimized later with a Free List)
        let index = -1;
        for (let i = 0; i < MAX_JOBS; i++) {
            if (this.active[i] === 0) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            this.active[index] = 1;
            this.type[index] = type;
            this.targetId[index] = targetId;
            this.priority[index] = priority;
            this.assignedSprigId[index] = -1; // Open job
            this.count++;
        }

        return index;
    }

    public remove(index: number) {
        if (index < 0 || index >= MAX_JOBS || this.active[index] === 0) return;

        this.active[index] = 0;
        this.type[index] = JobType.IDLE;
        this.targetId[index] = -1;
        this.assignedSprigId[index] = -1;
        this.priority[index] = 0;
        this.count--;
    }

    public assign(jobId: number, sprigId: number) {
        if (this.active[jobId]) {
            this.assignedSprigId[jobId] = sprigId;
        }
    }

    public unassign(jobId: number) {
        if (this.active[jobId]) {
            this.assignedSprigId[jobId] = -1;
        }
    }
}
