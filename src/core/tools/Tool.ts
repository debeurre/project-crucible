import { WorldState } from '../../core/WorldState';

export interface Tool {
    onDown(world: WorldState, x: number, y: number): void;
    onDrag(world: WorldState, x: number, y: number): void;
    onUp(world: WorldState, x: number, y: number): void;
    cycleOption?(): void;
    getOptionName?(): string;
}
