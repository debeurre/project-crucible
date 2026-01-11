export const Terrain = {
    VOID: 0,
    GRASS: 1,
    MUD: 2,
    WATER: 3
};

export class MapData {
    public width: number;
    public height: number;
    public terrain: Uint8Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.terrain = new Uint8Array(width * height);
    }

    public getIndex(x: number, y: number): number {
        return y * this.width + x;
    }

    public isBlocked(col: number, row: number): boolean {
        if (col < 0 || col >= this.width || row < 0 || row >= this.height) return true;
        const index = this.getIndex(col, row);
        const val = this.terrain[index];
        if (val === Terrain.VOID) return true;
        return false;
    }
}
