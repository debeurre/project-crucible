import { Tool, ToolOption } from './Tool';
import { WorldState } from '../core/WorldState';
import { StructureType, getStructureStats, STRUCTURE_STATS } from '../data/StructureData';

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

    public setOption(value: number): void {
        this.currentType = value;
    }

    public getOptionName(): string {
        return getStructureStats(this.currentType).name;
    }

    public getAvailableOptions(): ToolOption[] {
        // Map STRUCTURE_STATS to ToolOptions
        const options: ToolOption[] = [];
        const types = [StructureType.NEST, StructureType.CRUMB, StructureType.COOKIE, StructureType.ROCK];
        
        types.forEach(type => {
            const stats = STRUCTURE_STATS[type];
            options.push({
                value: type,
                name: stats.name,
                color: '#' + stats.color.toString(16).padStart(6, '0')
            });
        });
        return options;
    }
}