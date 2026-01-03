import { MapData } from '../data/MapData';
import { CONFIG } from './Config';
import { EntityData } from '../data/EntityData';

export class WorldState {
    public map: MapData;
    public sprigs: EntityData;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.sprigs = new EntityData();

        // Spawn Test Swarm
        const centerX = (CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE) / 2;
        const centerY = (CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE) / 2;
        
        for (let i = 0; i < 100; i++) {
            const x = centerX + (Math.random() - 0.5) * 100;
            const y = centerY + (Math.random() - 0.5) * 100;
            this.sprigs.spawn(x, y);
        }
    }
}
