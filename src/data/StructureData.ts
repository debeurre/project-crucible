export enum StructureType {
    NEST = 0,
    CRUMB = 1,
    COOKIE = 2,
    ROCK = 3
}

export interface StructureStats {
    name: string;
    radius: number;
    color: number;  // Hex
    solid: boolean; // True = Hard collision
    shape: 'CIRCLE' | 'DIAMOND';
}

// THE BLUEPRINT
export const STRUCTURE_STATS: Record<StructureType, StructureStats> = {
    [StructureType.NEST]:   { name: 'Nest',   radius: 30, color: 0xFFD700, solid: false, shape: 'CIRCLE' },
    [StructureType.CRUMB]:  { name: 'Crumb',  radius: 10,  color: 0xB8860B, solid: false, shape: 'DIAMOND' },
    [StructureType.COOKIE]: { name: 'Cookie', radius: 45, color: 0xDAA520, solid: false, shape: 'CIRCLE' },
    [StructureType.ROCK]:   { name: 'Rock',   radius: 40, color: 0x808080, solid: true,  shape: 'CIRCLE' }
};

export interface Structure {
    id: number;
    type: StructureType;
    x: number;
    y: number;
    value?: number; // Health or Stock
}

export const getStructureStats = (type: StructureType): StructureStats => {
    return STRUCTURE_STATS[type];
};