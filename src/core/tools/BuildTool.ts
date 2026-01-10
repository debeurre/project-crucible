import { Tool } from './Tool';
import { WorldState } from '../../core/WorldState';
import { StructureType, getStructureStats } from '../../data/StructureData';

export class BuildTool implements Tool {
    private currentType: StructureType = StructureType.NEST;

    public onDown(world: WorldState, x: number, y: number): void {
        world.structures.push({
            id: world.structures.length,
            type: this.currentType,
            x: x,
            y: y
        });
        world.refreshGrid();
    }

    public onDrag(_world: WorldState, _x: number, _y: number): void {}

    public onUp(_world: WorldState, _x: number, _y: number): void {}

    public cycleOption(): void {
        this.currentType++;
        if (this.currentType > StructureType.ROCK) {
            this.currentType = StructureType.NEST;
        }
    }

    public getOptionName(): string {
        return getStructureStats(this.currentType).name;
    }
}
