import { MapData } from '../data/MapData';
import { CONFIG } from './Config';
import { EntityData } from '../data/EntityData';
import { Structure, StructureType } from '../data/StructureData';

export class WorldState {
    public map: MapData;
    public sprigs: EntityData;
    public structures: Structure[];
    public foodStored: number = 0;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.sprigs = new EntityData();
        this.structures = [];

        // Structures
        this.structures.push({ id: 0, type: StructureType.NEST, x: 100, y: 300, radius: 30 });
        this.structures.push({ id: 1, type: StructureType.COOKIE, x: 700, y: 300, radius: 30 });
        
        // Obstacles
        this.structures.push({ id: 2, type: StructureType.ROCK, x: 300, y: 300, radius: 30 });
        this.structures.push({ id: 3, type: StructureType.ROCK, x: 500, y: 300, radius: 40 });
        this.structures.push({ id: 4, type: StructureType.ROCK, x: 400, y: 200, radius: 25 });

        // Spawn Test Swarm
        // Spawn at Nest
        const startX = 100;
        const startY = 300;
        
        for (let i = 0; i < 10; i++) {
            const x = startX + (Math.random() - 0.5) * 50;
            const y = startY + (Math.random() - 0.5) * 50;
            this.sprigs.spawn(x, y);
        }
    }
}