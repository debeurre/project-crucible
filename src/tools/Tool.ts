import { WorldState } from '../core/WorldState';

export interface ToolOption {
    value: number;
    name: string;
    color: string; // Hex string e.g. '#ffffff'
}

export interface Tool {
    onDown(world: WorldState, x: number, y: number): void;
    onDrag(world: WorldState, x: number, y: number): void;
    onUp(world: WorldState, x: number, y: number): void;
    cycleOption?(): void;
    setOption?(value: number): void;
    getOptionName?(): string;
    getAvailableOptions?(): ToolOption[];
}
