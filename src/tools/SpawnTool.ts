import { Tool } from './Tool';
import { WorldState } from '../core/WorldState';

export class SpawnTool implements Tool {
    public onDown(world: WorldState, x: number, y: number): void {
        world.sprigs.spawn(x, y);
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        world.sprigs.spawn(x, y);
    }

    public onUp(_world: WorldState, _x: number, _y: number): void {}

    public cycleOption(): void {}

    public getOptionName(): string {
        return "SPRIG";
    }
}
