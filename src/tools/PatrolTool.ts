import { Tool } from './Tool';
import { WorldState } from '../core/WorldState';
import { StructureType, createStructure } from '../data/StructureData';

export class PatrolTool implements Tool {
    public onDown(world: WorldState, x: number, y: number): void {
        const signal = createStructure(StructureType.SIGNAL_PATROL, x, y);
        signal.id = world.nextStructureId++;
        
        world.structures.push(signal);
        world.structureHash.add(signal);
        
        // Note: JobDispatchSystem will pick this up and assign a job automatically
    }

    public onDrag(_world: WorldState, _x: number, _y: number): void {}
    public onUp(_world: WorldState, _x: number, _y: number): void {}
}
