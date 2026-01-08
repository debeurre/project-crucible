import { MapData } from '../data/MapData';
import { CONFIG, SCREEN_WIDTH, SCREEN_HEIGHT } from './Config';
import { EntityData } from '../data/EntityData';
import { Structure } from '../data/StructureData';
import { Grid } from './Grid';

export class WorldState {
    public map: MapData;
    public sprigs: EntityData;
    public structures: Structure[];
    public grid: Grid;
    public foodStored: number = 0;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.sprigs = new EntityData();
        this.structures = []; // Cleared
        this.grid = new Grid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        // Spawn centered with offset
        const cx = SCREEN_WIDTH / 2;
        const cy = SCREEN_HEIGHT / 2;
        
        for (let i = 0; i < CONFIG.START_SPRIGS; i++) {
            const x = cx + (Math.random() - 0.5) * 50;
            const y = cy + (Math.random() - 0.5) * 50;
            this.sprigs.spawn(x, y);
        }
        
        // No bake logic needed yet as structures is empty
    }

    public refreshGrid() {
        // Placeholder
        if (this.structures.length > 0) {
            this.grid.bake(this.structures);
        }
    }
}
