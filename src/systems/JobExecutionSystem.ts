import { WorldState } from '../core/WorldState';
import { JobType } from '../data/JobData';
import { StructureType, getStructureStats, Structure } from '../data/StructureData';
import { CONFIG } from '../core/Config';
import { SprigState } from '../data/SprigState';

const DEG_TO_RAD = Math.PI / 180;

export class JobExecutionSystem {
    private frameCount: number = 0;

    public update(world: WorldState, dt: number) {
        this.frameCount++;
        const sprigs = world.sprigs;
        const jobs = world.jobs;

        if (!jobs) return; 

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;

            const jobId = sprigs.jobId[i];
            
            // Passive Discovery
            if ((i + this.frameCount) % 30 === 0) {
                this.scanForResources(world, i, jobId);
            }

            const currentJobId = sprigs.jobId[i];

            if (currentJobId === -1) {
                this.handleIdle(world, i, dt);
                continue;
            }

            // Verify Job
            if (!jobs.active[currentJobId] || jobs.assignedSprigId[currentJobId] !== i) {
                sprigIdToIdle(world, i);
                continue;
            }

            const type = jobs.type[currentJobId];
            if (type === JobType.HARVEST) {
                this.handleHarvest(world, i, currentJobId);
            }
        }
    }

    private scanForResources(world: WorldState, i: number, currentJobId: number) {
        const sprigs = world.sprigs;
        
        if (sprigs.stock[i].count('FOOD') > 0) return;

        const x = sprigs.x[i];
        const y = sprigs.y[i];
        const VIEW_RADIUS = CONFIG.SPRIG_VIEW_RADIUS;

        const nearby = world.structureHash.query(x, y, VIEW_RADIUS);

        for (const s of nearby) {
            if (s.type === StructureType.COOKIE || s.type === StructureType.CRUMB || s.type === StructureType.BUSH) {
                if (s.stock && s.stock.count('FOOD') > 0) {
                    const currentTargetId = currentJobId !== -1 ? world.jobs.targetId[currentJobId] : -1;
                    
                    // Memory: Remember this source (if not current target)
                    if (s.id !== currentTargetId) {
                        sprigs.addDiscovery(i, s.id);
                    }

                    if (s.id === currentTargetId) continue; 

                    const distToNew = (s.x - x)**2 + (s.y - y)**2;
                    let distToOld = Infinity;
                    
                    if (currentJobId !== -1) {
                        distToOld = (sprigs.targetX[i] - x)**2 + (sprigs.targetY[i] - y)**2;
                    }

                    if (distToNew < distToOld * 0.8) {
                        this.swapJob(world, i, currentJobId, s.id);
                        return;
                    }
                }
            }
        }
    }

    private swapJob(world: WorldState, sprigId: number, oldJobId: number, newTargetId: number) {
        if (oldJobId !== -1) {
            world.jobs.unassign(oldJobId);
        }
        
        const newJobId = world.jobs.add(JobType.HARVEST, newTargetId, 8);
        if (newJobId !== -1) {
            world.jobs.assign(newJobId, sprigId);
            world.sprigs.jobId[sprigId] = newJobId;
            world.sprigs.state[sprigId] = SprigState.MOVE_TO_SOURCE;
        }
    }

    private handleIdle(world: WorldState, i: number, dt: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;

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

        sprigs.timer[i] -= dt;
        if (sprigs.timer[i] <= 0) {
            sprigs.timer[i] = CONFIG.WANDER_TMIN + Math.random() * (CONFIG.WANDER_TMAX - CONFIG.WANDER_TMIN);
            
            const homeId = sprigs.homeID[i];
            const home = homeId !== -1 ? structures.find(s => s.id === homeId) : null;

            if (home) {
                const sx = sprigs.x[i];
                const sy = sprigs.y[i];
                const hx = home.x;
                const hy = home.y;
                const dx = sx - hx;
                const dy = sy - hy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let baseAngle = 0;
                let variance = 0;

                if (dist < CONFIG.NEST_VIEW_RADIUS) {
                    baseAngle = Math.atan2(sy - hy, sx - hx);
                    variance = (Math.random() - 0.5) * (90 * 2 * DEG_TO_RAD);
                } else {
                    baseAngle = Math.atan2(hy - sy, hx - sx);
                    variance = (Math.random() - 0.5) * (45 * 2 * DEG_TO_RAD);
                }

                const angle = baseAngle + variance;
                sprigs.targetX[i] = sx + Math.cos(angle) * CONFIG.WANDER_DIST;
                sprigs.targetY[i] = sy + Math.sin(angle) * CONFIG.WANDER_DIST;
            } else {
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

        if ((!source || !source.stock || source.stock.count('FOOD') <= 0) && !carrying) {
            this.completeJob(world, i, jobId);
            return;
        }

        if ((!source || !source.stock || source.stock.count('FOOD') <= 0) && carrying && state !== SprigState.MOVE_TO_SINK) {
            sprigs.state[i] = SprigState.MOVE_TO_SINK;
        }

        if (sprigs.state[i] === SprigState.MOVE_TO_SOURCE) {
            if (!source) return; 

            sprigs.targetX[i] = source.x;
            sprigs.targetY[i] = source.y;
            
            const dx = sprigs.x[i] - source.x;
            const dy = sprigs.y[i] - source.y;
            const distSq = dx*dx + dy*dy;
            const range = getStructureStats(source.type).radius + 15;

            if (distSq < range * range) {
                // Take up to 5 units
                const amount = Math.min(5, source.stock!.count('FOOD'));
                
                if (amount > 0 && source.stock!.remove('FOOD', amount)) {
                    sprigs.stock[i].add('FOOD', amount);
                    sprigs.state[i] = SprigState.MOVE_TO_SINK;

                    // Clean up Empty Source
                    if (source.stock!.count('FOOD') <= 0) {
                        if (source.type !== StructureType.BUSH) {
                            this.destroyStructure(world, source);
                        }
                    }
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
                const amount = sprigs.stock[i].count('FOOD');
                if (nest.stock && sprigs.stock[i].remove('FOOD', amount)) {
                    nest.stock.add('FOOD', amount);
                    
                    // Scout: Share knowledge
                    if (nest.knownStructures) {
                        // 1. Direct Target
                        if (source && !nest.knownStructures.includes(source.id)) {
                            nest.knownStructures.push(source.id);
                        }
                        // 2. Buffered Memories
                        const start = i * sprigs.MEMORY_CAPACITY;
                        const count = sprigs.discoveryCount[i];
                        for(let m=0; m<count; m++) {
                            const id = sprigs.discoveryBuffer[start + m];
                            if (!nest.knownStructures.includes(id)) {
                                nest.knownStructures.push(id);
                            }
                        }
                        // 3. Wipe Memory
                        sprigs.clearDiscoveries(i);
                    }
                }
                
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

    private destroyStructure(world: WorldState, structure: Structure) {
        world.structureHash.remove(structure);
        const idx = world.structures.indexOf(structure);
        if (idx !== -1) {
            world.structures.splice(idx, 1);
        }
        world.refreshGrid(); // Optional: unblock pathing
    }
}

function sprigIdToIdle(world: WorldState, id: number) {
    world.sprigs.jobId[id] = -1;
    world.sprigs.state[id] = SprigState.IDLE;
    world.sprigs.timer[id] = 0; 
}