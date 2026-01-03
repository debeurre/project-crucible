import { MapData } from '../data/MapData';
import { CONFIG } from './Config';

export class WorldState {
    public map: MapData;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    }
}
