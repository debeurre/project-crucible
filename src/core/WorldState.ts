import { MapData } from '../data/MapData';
import { CONFIG } from './Config';
import { EntityData } from '../data/EntityData';
import { Structure, StructureType } from '../data/StructureData';
import { Grid } from './Grid';
import { FlowField } from './FlowField';

export class WorldState {
    public map: MapData;
    public sprigs: EntityData;
    public structures: Structure[];
    public grid: Grid;
    public flowField: FlowField;
    public foodStored: number = 0;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.sprigs = new EntityData();
        this.structures = [];
        this.grid = new Grid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.flowField = new FlowField(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        const cx = (CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE) / 2;
        const cy = (CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE) / 2;

        // Structures
        this.structures.push({ id: 0, type: StructureType.NEST, x: cx - 200, y: cy, radius: 30 });
        this.structures.push({ id: 1, type: StructureType.COOKIE, x: cx + 200, y: cy, radius: 30 });
        
        // Obstacles
        this.structures.push({ id: 2, type: StructureType.ROCK, x: cx, y: cy, radius: 30 });
        this.structures.push({ id: 3, type: StructureType.ROCK, x: cx + 90, y: cy - 50, radius: 40 });
        this.structures.push({ id: 4, type: StructureType.ROCK, x: cx - 90, y: cy + 25, radius: 25 });

        // Spawn Test Swarm (Explosive Ring)
        const nest = this.structures.find(s => s.type === StructureType.NEST)!;
        const cookie = this.structures.find(s => s.type === StructureType.COOKIE)!;
        
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = nest.radius + 50 + Math.random() * 20;
            const x = nest.x + Math.cos(angle) * dist;
            const y = nest.y + Math.sin(angle) * dist;
            this.sprigs.spawn(x, y);
        }

        // The Seeder
        const seederIdx = this.sprigs.spawn(cookie.x, cookie.y);
        if (seederIdx !== -1) {
            this.sprigs.cargo[seederIdx] = 1; // Already has food
            this.sprigs.state[seederIdx] = 2; // MOVING_TO_SINK
        }
        
        this.refreshGrid();
    }

    public refreshGrid() {
        this.grid.bake(this.structures);
    }
}