export class MapData {
    public width: number;
    public height: number;
    public tiles: Uint8Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.tiles = new Uint8Array(width * height);
    }

    public getIndex(x: number, y: number): number {
        return y * this.width + x;
    }

    public isWalkable(x: number, y: number): boolean {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        // 0 = Empty/Walkable, 1 = Wall/Obstacle
        return this.tiles[this.getIndex(x, y)] === 0;
    }
}
