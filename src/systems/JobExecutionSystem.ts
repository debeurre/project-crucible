import { WorldState } from '../core/WorldState';
import { JobType } from '../data/JobData';
import { StructureType } from '../data/StructureData';
import { CONFIG } from '../core/Config';
import { SprigState } from '../data/SprigState';
import { HarvestRunner } from './jobs/HarvestRunner';

import { EntityType } from '../data/EntityData';

const DEG_TO_RAD = Math.PI / 180;

export class JobExecutionSystem {
    private frameCount: number = 0;

    public update(world: WorldState, dt: number) {
        this.frameCount++;
        const sprigs = world.sprigs;
        const jobs = world.jobs;
        if (!jobs) return; 

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0 || sprigs.type[i] === EntityType.THIEF) continue;
            if (sprigs.state[i] === SprigState.FORCED_MARCH) continue;

            const jobId = sprigs.jobId[i];
            if ((i + this.frameCount) % 30 === 0) this.scanForResources(world, i, jobId);

            if (sprigs.jobId[i] === -1) {
                this.handleIdle(world, i, dt);
                continue;
            }

            const currentJobId = sprigs.jobId[i];
            if (!jobs.active[currentJobId] || jobs.assignedSprigId[currentJobId] !== i) {
                this.sprigIdToIdle(world, i);
                continue;
            }

            const type = jobs.type[currentJobId];
            if (type === JobType.HARVEST) {
                HarvestRunner.handle(world, i, currentJobId);
            }
        }
    }

    private scanForResources(world: WorldState, i: number, currentJobId: number) {
        const sprigs = world.sprigs;
        if (sprigs.stock[i].count('FOOD') > 0) return;

        const x = sprigs.x[i], y = sprigs.y[i];
        const nearby = world.structureHash.query(x, y, CONFIG.SPRIG_VIEW_RADIUS);

        for (const s of nearby) {
            if ((s.type === StructureType.COOKIE || s.type === StructureType.CRUMB || s.type === StructureType.BUSH) && s.stock && s.stock.count('FOOD') > 0) {
                if (s.id !== (currentJobId !== -1 ? world.jobs.targetId[currentJobId] : -1)) {
                    sprigs.addDiscovery(i, s.id);
                }
                if (s.id === (currentJobId !== -1 ? world.jobs.targetId[currentJobId] : -1)) continue; 

                const distToNew = (s.x - x)**2 + (s.y - y)**2;
                let distToOld = currentJobId !== -1 ? (sprigs.targetX[i] - x)**2 + (sprigs.targetY[i] - y)**2 : Infinity;

                if (distToNew < distToOld * 0.8) {
                    this.swapJob(world, i, currentJobId, s.id);
                    return;
                }
            }
        }
    }

    private swapJob(world: WorldState, sprigId: number, oldJobId: number, newTargetId: number) {
        if (oldJobId !== -1) world.jobs.unassign(oldJobId);
        const newJobId = world.jobs.add(JobType.HARVEST, newTargetId, 8);
        if (newJobId !== -1) {
            world.jobs.assign(newJobId, sprigId);
            world.sprigs.jobId[sprigId] = newJobId;
            world.sprigs.state[sprigId] = SprigState.MOVE_TO_SOURCE;
        }
    }

    private handleIdle(world: WorldState, i: number, dt: number) {
        const sprigs = world.sprigs;
        if (sprigs.homeID[i] === -1) {
             let bestDistSq = Infinity, bestNest = null;
             for (const s of world.structures) {
                 if (s.type === StructureType.NEST) {
                     const distSq = (sprigs.x[i] - s.x)**2 + (sprigs.y[i] - s.y)**2;
                     if (distSq < bestDistSq) { bestDistSq = distSq; bestNest = s; }
                 }
             }
             if (bestNest) sprigs.homeID[i] = bestNest.id;
        }

        sprigs.timer[i] -= dt;
        if (sprigs.timer[i] <= 0) {
            sprigs.timer[i] = CONFIG.WANDER_TMIN + Math.random() * (CONFIG.WANDER_TMAX - CONFIG.WANDER_TMIN);
            const home = world.structures.find(s => s.id === sprigs.homeID[i]);
            let baseAngle = 0, variance = 0;
            if (home) {
                const dist = Math.sqrt((sprigs.x[i] - home.x)**2 + (sprigs.y[i] - home.y)**2);
                if (dist < CONFIG.NEST_VIEW_RADIUS) {
                    baseAngle = Math.atan2(sprigs.y[i] - home.y, sprigs.x[i] - home.x);
                    variance = (Math.random() - 0.5) * (180 * DEG_TO_RAD);
                } else {
                    baseAngle = Math.atan2(home.y - sprigs.y[i], home.x - sprigs.x[i]);
                    variance = (Math.random() - 0.5) * (90 * DEG_TO_RAD);
                }
            } else { baseAngle = Math.random() * Math.PI * 2; }
            const angle = baseAngle + variance;
            sprigs.targetX[i] = sprigs.x[i] + Math.cos(angle) * CONFIG.WANDER_DIST;
            sprigs.targetY[i] = sprigs.y[i] + Math.sin(angle) * CONFIG.WANDER_DIST;
        }
    }

    private sprigIdToIdle(world: WorldState, id: number) {
        world.sprigs.jobId[id] = -1;
        world.sprigs.state[id] = SprigState.IDLE;
        world.sprigs.timer[id] = 0; 
    }
}
