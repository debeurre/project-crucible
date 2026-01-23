import { WorldState } from '../../core/WorldState';
import { StructureType, getStructureStats } from '../../data/StructureData';
import { SprigState } from '../../data/SprigState';
import { CONFIG } from '../../core/Config';
import { EvolutionService } from '../services/EvolutionService';

export class HarvestRunner {
    public static handle(world: WorldState, i: number, jobId: number) {
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
            this.handleMoveToSource(world, i, source!, jobId);
        } else if (sprigs.state[i] === SprigState.MOVE_TO_SINK) {
            this.handleMoveToSink(world, i, source!, jobId);
        } else if (sprigs.state[i] === SprigState.IDLE) {
            sprigs.state[i] = carrying ? SprigState.MOVE_TO_SINK : SprigState.MOVE_TO_SOURCE;
        } else {
            sprigs.state[i] = SprigState.MOVE_TO_SOURCE;
        }
    }

    private static handleMoveToSource(world: WorldState, i: number, source: any, jobId: number) {
        const sprigs = world.sprigs;
        sprigs.targetX[i] = source.x;
        sprigs.targetY[i] = source.y;
        
        const dx = sprigs.x[i] - source.x;
        const dy = sprigs.y[i] - source.y;
        const distSq = dx*dx + dy*dy;
        const range = getStructureStats(source.type).radius + 15;

        if (distSq < range * range) {
            const amount = Math.min(sprigs.carryCapacity[i], source.stock!.count('FOOD'));
            if (amount > 0 && source.stock!.remove('FOOD', amount)) {
                sprigs.stock[i].add('FOOD', amount);
                sprigs.state[i] = SprigState.MOVE_TO_SINK;
                if (source.stock!.count('FOOD') <= 0 && source.type !== StructureType.BUSH && source.type !== StructureType.BURROW) {
                    this.destroyStructure(world, source);
                }
            } else {
                this.completeJob(world, i, jobId);
            }
        }
    }

    private static handleMoveToSink(world: WorldState, i: number, source: any, jobId: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;
        let nest = sprigs.homeID[i] !== -1 ? structures.find(s => s.id === sprigs.homeID[i]) : null;
        if (!nest) nest = structures.find(s => s.type === StructureType.NEST);
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
                this.gossip(world, i, nest, source);
                
                // XP Hook
                sprigs.xp_haul[i] += CONFIG.XP_PER_HAUL;
                EvolutionService.checkLevelUp(sprigs, i);
            }
            
            // Always complete job after delivery to allow priority re-evaluation
            this.completeJob(world, i, jobId);
        }
    }

    private static gossip(world: WorldState, i: number, nest: any, source: any) {
        if (!nest.knownStructures) return;
        if (source && !nest.knownStructures.includes(source.id)) nest.knownStructures.push(source.id);
        const sprigs = world.sprigs;
        const start = i * sprigs.MEMORY_CAPACITY;
        for(let m=0; m < sprigs.discoveryCount[i]; m++) {
            const id = sprigs.discoveryBuffer[start + m];
            if (!nest.knownStructures.includes(id)) nest.knownStructures.push(id);
        }
        sprigs.clearDiscoveries(i);
    }

    private static completeJob(world: WorldState, sprigId: number, jobId: number) {
        world.jobs.unassign(jobId);
        world.jobs.remove(jobId);
        world.sprigs.jobId[sprigId] = -1;
        world.sprigs.state[sprigId] = SprigState.IDLE;
        world.sprigs.timer[sprigId] = 0;
    }

    private static destroyStructure(world: WorldState, s: any) {
        world.structureHash.remove(s);
        const idx = world.structures.indexOf(s);
        if (idx !== -1) world.structures.splice(idx, 1);
        world.refreshGrid();
    }
}
