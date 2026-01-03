export enum StructureType {
    NEST = 0,
    COOKIE = 1,
    ROCK = 2
}

export interface Structure {
    id: number;
    type: StructureType;
    x: number;
    y: number;
    radius: number;
}
