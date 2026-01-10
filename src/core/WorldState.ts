import { MapData, Terrain } from '../data/MapData';
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
    public terrainDirty: boolean = true;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.sprigs = new EntityData();
        this.structures = [];
        this.grid = new Grid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        // 1. Coordinates (Grid Space)
        const nestX = 10;
        const nestY = 17;
        const cookieX = 50;
        const cookieY = 17;
        
        // 2. Structures (World Space)
        // Nest & Cookie
        this.structures.push({ id: 0, type: StructureType.NEST, x: nestX * CONFIG.GRID_SIZE, y: nestY * CONFIG.GRID_SIZE });
        this.structures.push({ id: 1, type: StructureType.COOKIE, x: cookieX * CONFIG.GRID_SIZE, y: cookieY * CONFIG.GRID_SIZE });
        
        // The Gauntlet (Rocks)
        // Top Rock
        this.structures.push({ id: 2, type: StructureType.ROCK, x: 28 * CONFIG.GRID_SIZE, y: 10 * CONFIG.GRID_SIZE });
        // Middle Rock (Shifted right to create a slalom)
        this.structures.push({ id: 3, type: StructureType.ROCK, x: 32 * CONFIG.GRID_SIZE, y: 17 * CONFIG.GRID_SIZE });
        // Bottom Rock
        this.structures.push({ id: 4, type: StructureType.ROCK, x: 28 * CONFIG.GRID_SIZE, y: 24 * CONFIG.GRID_SIZE });

        // 3. Terrain Painting
        this.map.terrain.fill(Terrain.GRASS);

        // Fill Mud (Top Route: From Top Rock to Cookie)
        for (let y = 5; y < 15; y++) {
            for (let x = 25; x < 50; x++) {
                const idx = y * CONFIG.WORLD_WIDTH + x;
                this.map.terrain[idx] = Terrain.MUD; 
            }
        }
        // Fill Water (Bottom Route: Blocks the bottom rock area)
        for (let y = 22; y < 30; y++) {
            for (let x = 25; x < 35; x++) {
                const idx = y * CONFIG.WORLD_WIDTH + x;
                this.map.terrain[idx] = Terrain.WATER;
            }
        }

        // 4. Spawn Sprigs (Around Nest)
        const spawnCX = nestX * CONFIG.GRID_SIZE;
        const spawnCY = nestY * CONFIG.GRID_SIZE;
        
        for (let i = 0; i < CONFIG.START_SPRIGS; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 50; // Outside Nest Radius
            this.sprigs.spawn(spawnCX + Math.cos(angle) * dist, spawnCY + Math.sin(angle) * dist);
        }
        
        // Initial Bake
        this.refreshGrid();
    }

    public refreshGrid() {
        // Placeholder
        if (this.structures.length > 0) {
            this.grid.bake(this.structures);
        }
    }
}
