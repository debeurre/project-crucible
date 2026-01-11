import { MapData } from '../data/MapData';
import { CONFIG } from './Config';
import { EntityData } from '../data/EntityData';
import { Structure } from '../data/StructureData';
import { Grid } from './Grid';

export class WorldState {
    public map: MapData;
    public sprigs: EntityData;
    public structures: Structure[];
    public grid: Grid;
    public terrainDirty: boolean = true;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.sprigs = new EntityData();
        this.structures = [];
        this.grid = new Grid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        
        // Initial Bake
        this.refreshGrid();
    }

    public refreshGrid() {
        // Placeholder
        if (this.structures.length > 0) {
            this.grid.bake(this.structures);
        }
    }

    public serialize(): string {
        const levelData = {
            width: this.map.width,
            height: this.map.height,
            // Convert TypedArray to normal Array for JSON
            terrain: Array.from(this.map.terrain),
            structures: this.structures
        };
        return JSON.stringify(levelData);
    }

    public load(json: string) {
        const data = JSON.parse(json);

        // Restore Map
        this.map.width = data.width;
        this.map.height = data.height;
        this.map.terrain = new Uint8Array(data.terrain);

        // Restore Structures
        this.structures = data.structures;

        // Clear Sprigs (Reset population on load)
        this.sprigs = new EntityData();

        this.terrainDirty = true;
        this.refreshGrid();
    }
}
