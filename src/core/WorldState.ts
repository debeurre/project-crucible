import { MapData } from '../data/MapData';
import { CONFIG } from './Config';
import { EntityData } from '../data/EntityData';
import { Structure, StructureType } from '../data/StructureData';
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
        this.structures = [];
        this.grid = new Grid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        const cx = (CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE) / 2;
        const cy = (CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE) / 2;

        // Structures
        this.structures.push({ id: 0, type: StructureType.NEST, x: cx - 200, y: cy, radius: 30 });
        this.structures.push({ id: 1, type: StructureType.COOKIE, x: cx + 200, y: cy, radius: 30 });
        
        // Obstacles
        this.structures.push({ id: 2, type: StructureType.ROCK, x: cx, y: cy, radius: 30 });
        this.structures.push({ id: 3, type: StructureType.ROCK, x: cx + 90, y: cy - 50, radius: 40 });
        this.structures.push({ id: 4, type: StructureType.ROCK, x: cx - 90, y: cy + 25, radius: 25 });

        // Spawn Test Swarm
        // Spawn at Nest
        const startX = cx - 150;
        const startY = cy;
        
        for (let i = 0; i < 10; i++) {
            const x = startX + (Math.random() - 0.5) * 50;
            const y = startY + (Math.random() - 0.5) * 50;
            this.sprigs.spawn(x, y);
        }
        
        this.refreshGrid();
    }

    public refreshGrid() {
        this.grid.bake(this.structures);
    }
}