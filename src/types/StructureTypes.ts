export enum StructureType {
    NEST = 'NEST',
    COOKIE = 'COOKIE',
    CASTLE = 'CASTLE',
    BUSH = 'BUSH',
    RESOURCE_NODE = 'RESOURCE_NODE',
    LEGACY_CRUCIBLE = 'CRUCIBLE',
    ROCK = 'ROCK'
}

export interface StructureData {
    id: number;
    type: StructureType;
    x: number;
    y: number;
    radius: number;
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    flashTimer: number; // 0 = no flash, > 0 = frames remaining
    vertices?: number[]; // For polygonal structures like ROCK
}
