import { MapData } from '../data/MapData';
import { CONFIG } from './Config';
import { EntityData } from '../data/EntityData';
import { Structure, createStructure } from '../data/StructureData';
import { Grid } from './Grid';
import { SpatialHash } from './SpatialHash';
import { Stock } from '../components/Stock';
import { JobData } from '../data/JobData';

export class WorldState {
    public map: MapData;
    public sprigs: EntityData;
    public structures: Structure[];
    public jobs: JobData;
    public grid: Grid;
    public spatialHash: SpatialHash;
    public terrainDirty: boolean = true;
    public nextStructureId: number = 0;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.sprigs = new EntityData();
        this.structures = [];
        this.jobs = new JobData();
        this.grid = new Grid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.spatialHash = new SpatialHash(CONFIG.GRID_SIZE * 2);
        
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
            structures: this.structures,
            nextStructureId: this.nextStructureId
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
        this.structures = data.structures.map((loadedS: any) => {
            // 1. Create default template
            const s = createStructure(loadedS.type, loadedS.x, loadedS.y);
            
            // 2. Override with saved ID and data
            s.id = loadedS.id;

            // 3. Hydrate Stock if present
            if (loadedS.stock) {
                s.stock = Stock.deserialize(loadedS.stock);
            }
            
            return s;
        });

        // Restore ID Counter
        if (typeof data.nextStructureId === 'number') {
            this.nextStructureId = data.nextStructureId;
        } else {
            // Migration for old saves: Find max ID + 1
            let maxId = 0;
            for (const s of this.structures) {
                if (s.id > maxId) maxId = s.id;
            }
            this.nextStructureId = maxId + 1;
        }

        // Clear Sprigs (Reset population on load)
        this.sprigs = new EntityData();

        this.terrainDirty = true;
        this.refreshGrid();
    }
}